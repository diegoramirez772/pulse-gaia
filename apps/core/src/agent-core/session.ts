import type { FastifyRequest } from "fastify";
import { verifyHandoffToken, type IdentityPlatform } from "../handeia-auth.js";
import { PROTOTYPE_IDENTITY_ID } from "./identity.js";

export const IDENTITY_COOKIE = "pulse_identity_token";
export const PLATFORM_COOKIE = "pulse_identity_platform";

/**
 * Resolves the real agentIdentityId for a browser-originated request by
 * re-verifying the handoff cookie's signature on every call — the cookie
 * existing is never treated as proof by itself, same principle as
 * Nexus's `getHandoffIdentity` (lib/supabase/identity.ts). This is what
 * closes the actual security gap the URL-query-param approach had: a
 * client can no longer just claim any agentIdentityId in a request body
 * and have it trusted.
 *
 * `fallback` (an explicit value from a request body/query — used by the
 * curl-based demo flow, which has no cookie) is only used when there's no
 * valid cookie; the prototype identity is the last resort.
 */
export async function resolveAgentIdentityId(req: FastifyRequest, fallback?: string): Promise<string> {
  const token = req.cookies?.[IDENTITY_COOKIE];
  const secret = process.env.HANDEIA_CAPABILITY_KEY_SECRET;

  if (token && secret) {
    const platform = (req.cookies?.[PLATFORM_COOKIE] === "GANDIA" ? "GANDIA" : "HANDEIA") as IdentityPlatform;
    const claims = await verifyHandoffToken(token, secret, platform);
    if (claims) return claims.sub;
  }

  return fallback ?? PROTOTYPE_IDENTITY_ID;
}
