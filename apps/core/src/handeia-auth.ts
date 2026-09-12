import { handeia } from "@vaia-lab/sdk";

/**
 * Real Handeia JWT verification — same `@vaia-lab/sdk` (`handeia.jwt.verify`)
 * Nexus itself uses in `app/api/auth/handoff/route.ts`, not a
 * reimplementation. It checks signature AND expiry (`exp`/`iat`); the
 * tenant_id rejection below is an app-level check the SDK doesn't do
 * itself — mirrors Gandia-7's own `/api/store/verify-handeia-token`.
 */
export interface HandeiaClaims {
  sub: string;
  email?: string;
  name?: string;
  tenant_id?: string;
}

export async function verifyHandeiaToken(token: string, secret: string): Promise<HandeiaClaims | null> {
  try {
    const claims = (await handeia.jwt.verify(token, secret)) as HandeiaClaims;
    if (!claims.sub) return null;
    // An institutional (Gandia) token carries tenant_id — PULSE is a Handeia
    // (personal) capability and must refuse it.
    if (claims.tenant_id) return null;
    return claims;
  } catch {
    // Invalid signature, malformed token, or expired — never a 500, just
    // "not authenticated" (same treatment as Gandia-7's bridge routes).
    return null;
  }
}
