import { createHash } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createOpaqueToken, hashToken } from "@/lib/pops/auth";
import { AGENT_SCOPES } from "@/lib/pops/constants";
import { getPopsDb } from "@/lib/pops/db";

const ACCESS_SECONDS = 3600;
const GRANT_SECONDS = 30 * 24 * 3600;
export const OAUTH_ACCESS_PREFIX = "pops_oauth_";
const issuer = () => new URL(process.env.POPS_BASE_URL || "https://petercurry.org").origin;
export const oauthResource = () => `${issuer()}/api/pops/mcp`;
export const oauthMetadataUrl = () => `${issuer()}/.well-known/oauth-protected-resource/api/pops/mcp`;

export function protectedResourceMetadata() {
  return { resource: oauthResource(), authorization_servers: [issuer()], scopes_supported: AGENT_SCOPES, bearer_methods_supported: ["header"] };
}

export function authorizationServerMetadata() {
  return {
    issuer: issuer(),
    authorization_endpoint: `${issuer()}/pops/oauth/authorize`,
    token_endpoint: `${issuer()}/api/pops/oauth/token`,
    registration_endpoint: `${issuer()}/api/pops/oauth/register`,
    revocation_endpoint: `${issuer()}/api/pops/oauth/revoke`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none"],
    revocation_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
    authorization_response_iss_parameter_supported: true,
    scopes_supported: AGENT_SCOPES,
  };
}

export class OAuthError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

const redirectUriSchema = z.string().max(2048).url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password && !url.hash;
}, "Redirect URIs must use HTTPS without credentials or fragments.");

export const registrationSchema = z.object({
  client_name: z.string().trim().min(1).max(80).default("MCP client"),
  redirect_uris: z.array(redirectUriSchema).min(1).max(10),
  token_endpoint_auth_method: z.literal("none").default("none"),
  grant_types: z.array(z.enum(["authorization_code", "refresh_token"])).default(["authorization_code", "refresh_token"]),
  response_types: z.array(z.literal("code")).default(["code"]),
});

export async function registerOAuthClient(input: unknown) {
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success) throw new OAuthError("invalid_client_metadata", "Use HTTPS callbacks and public-client authentication (none).");
  const data = parsed.data;
  const client = await getPopsDb().popsOAuthClient.create({ data: { name: data.client_name, redirectUris: data.redirect_uris } });
  return { ...data, client_id: client.id, client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000) };
}

function scopesFrom(value: string | null) {
  const scopes = value === null ? [...AGENT_SCOPES] : [...new Set(value.split(/\s+/).filter(Boolean))];
  if (!scopes.length || scopes.some((s) => !(AGENT_SCOPES as readonly string[]).includes(s))) {
    throw new OAuthError("invalid_scope", "Unknown or empty POps permissions.");
  }
  return scopes;
}

export function parseAuthorizationRequest(params: URLSearchParams) {
  if (params.toString().length > 8192 || [...new Set(params.keys())].some((key) => params.getAll(key).length !== 1)) {
    throw new OAuthError("invalid_request", "Malformed authorization request.");
  }
  const clientId = params.get("client_id") || "";
  const redirectUri = params.get("redirect_uri") || "";
  const challenge = params.get("code_challenge") || "";
  if (!clientId || clientId.length > 200 || !redirectUriSchema.safeParse(redirectUri).success || params.get("response_type") !== "code" ||
      params.get("code_challenge_method") !== "S256" || !/^[A-Za-z0-9_-]{43}$/.test(challenge)) {
    throw new OAuthError("invalid_request", "An authorization code with S256 PKCE is required.");
  }
  if (params.get("resource") !== oauthResource()) throw new OAuthError("invalid_target", "This connection must target the POps MCP endpoint.");
  return { clientId, redirectUri, challenge, resource: oauthResource(), scopes: scopesFrom(params.get("scope")), state: params.get("state") };
}

export async function validateAuthorizationRequest(params: URLSearchParams) {
  const request = parseAuthorizationRequest(params);
  const client = await getPopsDb().popsOAuthClient.findUnique({ where: { id: request.clientId } });
  if (!client || !client.redirectUris.includes(request.redirectUri)) throw new OAuthError("invalid_request", "Unregistered client or callback.");
  return { ...request, client };
}

/** Called only by the owner-authenticated consent action, never by a public GET. */
export async function authorizeOAuthClient(params: URLSearchParams, approved: boolean, now = new Date()) {
  const request = await validateAuthorizationRequest(params);
  const callback = new URL(request.redirectUri);
  callback.searchParams.set("iss", issuer());
  if (request.state !== null) callback.searchParams.set("state", request.state);
  if (!approved) {
    callback.searchParams.set("error", "access_denied");
    return callback.toString();
  }
  const code = createOpaqueToken();
  await getPopsDb().popsOAuthCode.create({ data: {
    codeHash: hashToken(code), clientId: request.clientId, redirectUri: request.redirectUri, resource: request.resource,
    scopes: request.scopes, codeChallenge: request.challenge, expiresAt: new Date(now.getTime() + 5 * 60_000),
  } });
  callback.searchParams.set("code", code);
  return callback.toString();
}

async function issueTokens(tx: Prisma.TransactionClient, grantId: string, scopes: string[], now: Date) {
  const accessToken = OAUTH_ACCESS_PREFIX + createOpaqueToken();
  const refreshToken = "pops_refresh_" + createOpaqueToken();
  await tx.popsOAuthToken.create({ data: {
    grantId, accessHash: hashToken(accessToken), refreshHash: hashToken(refreshToken), expiresAt: new Date(now.getTime() + ACCESS_SECONDS * 1000),
  } });
  return { access_token: accessToken, token_type: "Bearer", expires_in: ACCESS_SECONDS, refresh_token: refreshToken, scope: scopes.join(" ") };
}

function invalidGrant(): never { throw new OAuthError("invalid_grant", "Expired, revoked, or invalid grant."); }

export async function exchangeOAuthToken(params: URLSearchParams, now = new Date()) {
  if ([...new Set(params.keys())].some((key) => params.getAll(key).length !== 1)) throw new OAuthError("invalid_request", "Duplicate parameters.");
  const clientId = params.get("client_id") || "";
  if (!clientId || clientId.length > 200) throw new OAuthError("invalid_client", "Client id required.");
  if (params.get("resource") !== oauthResource()) throw new OAuthError("invalid_target", "Wrong MCP resource.");
  if (params.get("client_secret")) throw new OAuthError("invalid_client", "This server uses public clients with PKCE.");

  if (params.get("grant_type") === "authorization_code") {
    const verifier = params.get("code_verifier") || "";
    if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) invalidGrant();
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    return getPopsDb().$transaction(async (tx) => {
      const code = await tx.popsOAuthCode.findUnique({ where: { codeHash: hashToken(params.get("code") || "") }, include: { client: true } });
      if (!code || code.consumedAt || code.expiresAt <= now || code.clientId !== clientId || code.redirectUri !== params.get("redirect_uri") ||
          code.resource !== oauthResource() || code.codeChallenge !== challenge) invalidGrant();
      const claimed = await tx.popsOAuthCode.updateMany({ where: { id: code.id, consumedAt: null }, data: { consumedAt: now } });
      if (claimed.count !== 1) invalidGrant();
      const grant = await tx.popsOAuthGrant.create({ data: {
        client: { connect: { id: clientId } }, resource: code.resource, expiresAt: new Date(now.getTime() + GRANT_SECONDS * 1000),
        credential: { create: { name: `${code.client.name} (OAuth)`, tokenHash: hashToken(createOpaqueToken()), tokenPrefix: "OAuth", scopes: code.scopes } },
      } });
      return issueTokens(tx, grant.id, code.scopes, now);
    });
  }
  if (params.get("grant_type") === "refresh_token") {
    // Commit replay revocation before returning an error; throwing inside the
    // transaction would undo it. Keep used refresh hashes until the grant expires.
    const result = await getPopsDb().$transaction(async (tx) => {
      const token = await tx.popsOAuthToken.findUnique({ where: { refreshHash: hashToken(params.get("refresh_token") || "") }, include: { grant: { include: { credential: true } } } });
      if (!token || token.grant.clientId !== clientId || token.grant.resource !== oauthResource() || token.grant.expiresAt <= now || token.grant.credential.revokedAt) return null;
      const scopes = params.has("scope") ? scopesFrom(params.get("scope")) : token.grant.credential.scopes;
      if (scopes.some((scope) => !token.grant.credential.scopes.includes(scope))) throw new OAuthError("invalid_scope", "Cannot expand an existing grant.");
      const claimed = await tx.popsOAuthToken.updateMany({ where: { id: token.id, rotatedAt: null }, data: { rotatedAt: now } });
      if (claimed.count !== 1) {
        await tx.popsAgentCredential.update({ where: { id: token.grant.credentialId }, data: { revokedAt: now } });
        return null;
      }
      // Narrowing applies to the connection as well as the replacement tokens.
      await tx.popsAgentCredential.update({ where: { id: token.grant.credentialId }, data: { scopes } });
      return issueTokens(tx, token.grantId, scopes, now);
    });
    if (!result) invalidGrant();
    return result;
  }
  throw new OAuthError("unsupported_grant_type", "Use authorization_code or refresh_token.");
}

export async function authenticateOAuthToken(token: string, now: Date) {
  const record = await getPopsDb().popsOAuthToken.findUnique({ where: { accessHash: hashToken(token) }, include: { grant: { include: { credential: true } } } });
  if (!record || record.expiresAt <= now || record.grant.expiresAt <= now || record.grant.resource !== oauthResource() || record.grant.credential.revokedAt) return null;
  return record.grant.credential;
}

export async function revokeOAuthToken(clientId: string, token: string, now = new Date()) {
  const digest = hashToken(token);
  const record = await getPopsDb().popsOAuthToken.findFirst({ where: { OR: [{ accessHash: digest }, { refreshHash: digest }], grant: { clientId } }, include: { grant: true } });
  if (record) await getPopsDb().popsAgentCredential.update({ where: { id: record.grant.credentialId }, data: { revokedAt: now } });
}
