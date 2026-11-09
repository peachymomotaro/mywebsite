// @vitest-environment node
import { describe, expect, it } from "vitest";
import { authorizationServerMetadata, protectedResourceMetadata, registrationSchema, parseAuthorizationRequest, oauthResource } from "@/lib/pops/oauth";

describe("POps OAuth contract", () => {
  it("advertises PKCE, public client registration, and the same resource as discovery", () => {
    const metadata = authorizationServerMetadata();
    expect(metadata.code_challenge_methods_supported).toEqual(["S256"]);
    expect(metadata.token_endpoint_auth_methods_supported).toEqual(["none"]);
    expect(protectedResourceMetadata().resource).toBe(oauthResource());
    expect(protectedResourceMetadata().authorization_servers).toEqual([metadata.issuer]);
  });

  it("rejects unsafe redirect registrations and unsupported client authentication", () => {
    for (const uri of ["http://evil.example/callback", "javascript:alert(1)", "https://user:pass@example.com/callback", "https://example.com/#fragment"]) {
      expect(registrationSchema.safeParse({ redirect_uris: [uri] }).success).toBe(false);
    }
    expect(registrationSchema.safeParse({ redirect_uris: ["https://claude.ai/api/mcp/auth_callback"], token_endpoint_auth_method: "client_secret_post" }).success).toBe(false);
    expect(registrationSchema.safeParse({ redirect_uris: ["https://claude.ai/api/mcp/auth_callback"] }).success).toBe(true);
  });

  it("requires S256, rejects foreign audiences and unknown scopes", () => {
    const params = new URLSearchParams({ client_id: "abc", redirect_uri: "https://claude.ai/api/mcp/auth_callback", response_type: "code", code_challenge: "a".repeat(43), code_challenge_method: "S256", resource: oauthResource(), state: "opaque" });
    expect(parseAuthorizationRequest(params).scopes).toContain("tasks:write");
    for (const [key, value] of [["code_challenge_method", "plain"], ["resource", "https://evil.example"], ["scope", "admin"]]) {
      const invalid = new URLSearchParams(params);
      invalid.set(key, value);
      expect(() => parseAuthorizationRequest(invalid)).toThrow();
    }
  });
});
