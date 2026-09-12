import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyHandoffToken, type IdentityPlatform } from "../handeia-auth.js";
import { PROTOTYPE_IDENTITY_ID } from "./identity.js";

export const IDENTITY_COOKIE = "pulse_identity_token";
export const PLATFORM_COOKIE = "pulse_identity_platform";

/**
 * Local-only escape hatch for the curl-based demo flow, which has no
 * cookie. OFF unless explicitly enabled — it was previously always on as a
 * "fallback", which meant any unauthenticated caller could name any
 * agentIdentityId and be believed: read someone else's Work Graph, grant
 * itself capabilities, inject events. Never set this in a deployment.
 */
function insecureIdentityAllowed(): boolean {
  return process.env.ALLOW_INSECURE_IDENTITY === "true";
}

/**
 * The real agentIdentityId behind a request: the handoff cookie's
 * signature is re-verified on every call (the cookie existing is never
 * proof by itself — same principle as Nexus's `getHandoffIdentity`).
 * Returns null when there's no valid identity, and callers must treat
 * that as 401 rather than falling back to anything.
 */
export async function resolveAgentIdentityId(
  req: FastifyRequest,
  insecureFallback?: string,
): Promise<string | null> {
  const token = req.cookies?.[IDENTITY_COOKIE];
  const secret = process.env.HANDEIA_CAPABILITY_KEY_SECRET;

  if (token && secret) {
    const platform = (req.cookies?.[PLATFORM_COOKIE] === "GANDIA" ? "GANDIA" : "HANDEIA") as IdentityPlatform;
    const claims = await verifyHandoffToken(token, secret, platform);
    if (claims) return claims.sub;
  }

  if (insecureIdentityAllowed()) return insecureFallback ?? PROTOTYPE_IDENTITY_ID;

  return null;
}

/** Same, but writes the 401 for you. Returns null when the caller should stop. */
export async function requireAgentIdentityId(
  req: FastifyRequest,
  reply: FastifyReply,
  insecureFallback?: string,
): Promise<string | null> {
  const identity = await resolveAgentIdentityId(req, insecureFallback);
  if (!identity) {
    reply.code(401).send({ error: "identidad no autenticada — falta el handoff de Gandia/Handeia" });
    return null;
  }
  return identity;
}

/**
 * Device adapters (doc §13) have no browser session, so they authenticate
 * as a device with a shared secret instead. Fails closed: with no
 * DEVICE_INGEST_SECRET configured, adapter ingestion is refused rather
 * than left open to the internet.
 */
export function deviceIngestAuthorized(req: FastifyRequest): boolean {
  const expected = process.env.DEVICE_INGEST_SECRET;
  if (!expected) return insecureIdentityAllowed();
  return req.headers["x-pulse-device-secret"] === expected;
}
