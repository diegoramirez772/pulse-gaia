import type { FastifyInstance } from "fastify";
import { resolveIdentityFromHandeia } from "../agent-core/identity.js";
import { IDENTITY_COOKIE } from "../agent-core/session.js";
import { verifyHandeiaToken } from "../handeia-auth.js";

const COOKIE_MAX_AGE = 3600; // 1h — matches @vaia-lab/sdk's default token expiry

/**
 * The handoff endpoint every capability with real auth must implement
 * (doc: Pulse Gaia — Plan Gandia 7 Developers (Handeia)) — Handeia's proxy
 * lands the user here with `?handeia_token=`. Same shape as Nexus's own
 * `app/api/auth/handoff/route.ts`: the raw token goes into an httpOnly
 * cookie (never the URL — a URL ends up in server logs, browser history,
 * and Referer headers; a cookie doesn't), and every later request
 * re-verifies its signature (see agent-core/session.ts) instead of
 * trusting "the cookie exists".
 */
export async function authRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { handeia_token?: string; next?: string } }>("/api/auth/handoff", async (req, reply) => {
    const token = req.query.handeia_token;
    if (!token) return reply.code(400).send({ error: "handeia_token requerido" });

    const secret = process.env.HANDEIA_CAPABILITY_KEY_SECRET;
    if (!secret) return reply.code(500).send({ error: "HANDEIA_CAPABILITY_KEY_SECRET no configurado" });

    const claims = await verifyHandeiaToken(token, secret);
    if (!claims) return reply.code(401).send({ error: "token inválido o expirado" });

    const identity = await resolveIdentityFromHandeia(claims);

    reply.setCookie(IDENTITY_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });

    // Display-only — never used for auth, just so the surface can greet
    // the user by name without re-deriving identity client-side.
    const next = new URL(req.query.next || "/", `${req.protocol}://${req.headers.host}`);
    if (identity.displayName) next.searchParams.set("name", identity.displayName);

    reply.redirect(next.pathname + next.search, 302);
  });
}
