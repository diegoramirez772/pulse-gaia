import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Minimal HS256 verify for the handeia_token Gandia-7 signs on a space
 * handoff (see Pulse Gaia — Plan Gandia 7 Developers (Handeia)). Same
 * algorithm as `vaia-sdk/src/jwt-utils.ts` (header.payload.signature,
 * base64url, HMAC-SHA256, UTF-8 payload) reimplemented with Node's builtin
 * `crypto` instead of depending on the unpublished local vaia-sdk package.
 * PULSE only ever verifies tokens it receives — it never signs one, so
 * there's no v1/latin1 legacy path to support here, only the current
 * (v2, UTF-8) format Gandia-7 actually produces.
 */
export interface HandeiaClaims {
  sub: string;
  email?: string;
  name?: string;
  tenant_id?: string;
  v?: number;
}

function b64urlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = padded.length % 4 === 0 ? 0 : 4 - (padded.length % 4);
  return Buffer.from(padded + "=".repeat(padLength), "base64");
}

export function verifyHandeiaToken(token: string, secret: string): HandeiaClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts as [string, string, string];

  const expected = createHmac("sha256", secret).update(`${header}.${body}`).digest();
  let provided: Buffer;
  try {
    provided = b64urlDecode(signature);
  } catch {
    return null;
  }
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  let claims: HandeiaClaims;
  try {
    claims = JSON.parse(b64urlDecode(body).toString("utf-8"));
  } catch {
    return null;
  }

  if (!claims.sub) return null;
  // An institutional (Gandia) token carries tenant_id — PULSE is a Handeia
  // (personal) capability and must refuse it, same check as Gandia-7's own
  // /api/store/verify-handeia-token.
  if (claims.tenant_id) return null;

  return claims;
}
