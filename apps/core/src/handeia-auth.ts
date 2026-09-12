import { gandia, handeia } from "@vaia-lab/sdk";

/**
 * Real JWT verification via `@vaia-lab/sdk` — the same package and the same
 * both-platforms shape Nexus uses in its own
 * `app/api/auth/handoff/route.ts`, not a reimplementation. Signature and
 * expiry (`exp`/`iat`) are checked by the SDK.
 *
 * PULSE is published with `eco_target: 'both'`, so it gets opened from two
 * different launchers and must accept both tokens:
 *  - Handeia (`handeia_token`): personal identity, no tenant.
 *  - Gandia  (`gandia_token`):  institutional identity, carries `tenant_id`.
 * Both are signed with the SAME per-capability `key_secret` from
 * `developer_api_keys` (see Gandia-7's own verify-handeia-token comment),
 * so one secret verifies either one.
 */
export type IdentityPlatform = "HANDEIA" | "GANDIA";

export interface HandoffClaims {
  sub: string;
  email?: string;
  name?: string;
  tenant_id?: string;
  role?: string;
  permissions?: string[];
  platform: IdentityPlatform;
}

async function verifyWith(
  verifier: (token: string, secret: string) => Promise<unknown>,
  token: string,
  secret: string,
): Promise<Record<string, unknown> | null> {
  try {
    return (await verifier(token, secret)) as Record<string, unknown>;
  } catch {
    // Invalid signature, malformed, or expired — never a 500, just "not
    // authenticated" (same treatment as Gandia-7's own bridge routes).
    return null;
  }
}

export async function verifyHandoffToken(
  token: string,
  secret: string,
  platform: IdentityPlatform,
): Promise<HandoffClaims | null> {
  const verifier = platform === "GANDIA" ? gandia.jwt.verify : handeia.jwt.verify;
  const claims = await verifyWith(verifier, token, secret);
  if (!claims || typeof claims.sub !== "string" || !claims.sub) return null;

  // A token carrying tenant_id is institutional by definition — trust the
  // token's own shape over the query param it arrived in, so a Gandia token
  // can never be passed off as a personal Handeia identity (the crossing
  // Gandia-7 itself guards against in /api/store/verify-handeia-token).
  const resolvedPlatform: IdentityPlatform = claims.tenant_id ? "GANDIA" : "HANDEIA";
  if (resolvedPlatform !== platform) return null;

  return {
    sub: claims.sub,
    email: typeof claims.email === "string" ? claims.email : undefined,
    name: typeof claims.name === "string" ? claims.name : undefined,
    tenant_id: typeof claims.tenant_id === "string" ? claims.tenant_id : undefined,
    role: typeof claims.role === "string" ? claims.role : undefined,
    permissions: Array.isArray(claims.permissions) ? (claims.permissions as string[]) : undefined,
    platform: resolvedPlatform,
  };
}
