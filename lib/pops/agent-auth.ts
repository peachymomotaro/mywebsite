import { AGENT_SCOPES, type AgentScope } from "@/lib/pops/constants";
import { createOpaqueToken, hashToken } from "@/lib/pops/auth";
import { getPopsDb } from "@/lib/pops/db";

const TOKEN_PREFIX = "pops_";

export function isAgentScope(value: string): value is AgentScope {
  return (AGENT_SCOPES as readonly string[]).includes(value);
}

/** Returns the plaintext token exactly once; only its hash is stored. */
export async function createAgentCredential(name: string, scopes: string[]) {
  const cleanScopes = Array.from(new Set(scopes.filter(isAgentScope)));
  if (!cleanScopes.length) throw new Error("Choose at least one scope.");
  const token = `${TOKEN_PREFIX}${createOpaqueToken(32)}`;
  const credential = await getPopsDb().popsAgentCredential.create({
    data: {
      name: name.trim().slice(0, 80) || "Agent",
      tokenHash: hashToken(token),
      tokenPrefix: token.slice(0, TOKEN_PREFIX.length + 6),
      scopes: cleanScopes,
    },
  });
  return { token, credential };
}

export async function revokeAgentCredential(id: string, now = new Date()) {
  await getPopsDb().popsAgentCredential.updateMany({
    where: { id, revokedAt: null },
    data: { revokedAt: now },
  });
}

export function readBearerToken(header: string | null) {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

export type AgentPrincipal = { id: string; name: string; scopes: AgentScope[] };

export async function authenticateAgent(token: string | null, now = new Date()): Promise<AgentPrincipal | null> {
  if (!token || !token.startsWith(TOKEN_PREFIX) || token.length > 200) return null;
  const db = getPopsDb();
  const credential = await db.popsAgentCredential.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!credential || credential.revokedAt) return null;
  if (!credential.lastUsedAt || now.getTime() - credential.lastUsedAt.getTime() > 5 * 60 * 1000) {
    await db.popsAgentCredential.update({ where: { id: credential.id }, data: { lastUsedAt: now } });
  }
  return { id: credential.id, name: credential.name, scopes: credential.scopes.filter(isAgentScope) };
}
