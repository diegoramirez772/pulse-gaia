import type { FastifyInstance } from "fastify";
import { resolveIdentityFromHandoff } from "../agent-core/identity.js";
import { IDENTITY_COOKIE, PLATFORM_COOKIE } from "../agent-core/session.js";
import { verifyHandoffToken } from "../handeia-auth.js";

const COOKIE_MAX_AGE = 3600; // 1h — matches @vaia-lab/sdk's default token expiry

/**
 * The handoff endpoint every capability with real auth must implement
 * (doc: Pulse Gaia — Plan Gandia 7 Developers (Handeia)). Both launchers
 * land the user here — Handeia's with `?handeia_token=`, Gandia's with
 * `?gandia_token=` — exactly like Nexus's own
 * `app/api/auth/handoff/route.ts`, which is what lets one capability be
 * published with `eco_target: 'both'` and open from either Store.
 *
 * The raw token goes into an httpOnly cookie, never the URL (a URL ends up
 * in server logs, browser history and Referer headers; a cookie doesn't),
 * and every later request re-verifies its signature (agent-core/session.ts)
 * instead of trusting that the cookie exists.
 */
export async function authRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { handeia_token?: string; gandia_token?: string; next?: string } }>(
    "/api/auth/handoff",
    async (req, reply) => {
      const secret = process.env.HANDEIA_CAPABILITY_KEY_SECRET;
      if (!secret) return reply.code(500).send({ error: "HANDEIA_CAPABILITY_KEY_SECRET no configurado" });

      const gandiaToken = req.query.gandia_token;
      const handeiaToken = req.query.handeia_token;
      const token = gandiaToken ?? handeiaToken;
      if (!token) return reply.code(400).send({ error: "handeia_token o gandia_token requerido" });

      const claims = await verifyHandoffToken(token, secret, gandiaToken ? "GANDIA" : "HANDEIA");
      if (!claims) return reply.code(401).send({ error: "token inválido o expirado" });

      const identity = await resolveIdentityFromHandoff(claims);

      const cookieOpts = {
        httpOnly: true,
        sameSite: "lax" as const,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: COOKIE_MAX_AGE,
      };
      reply.setCookie(IDENTITY_COOKIE, token, cookieOpts);
      reply.setCookie(PLATFORM_COOKIE, claims.platform, cookieOpts);

      // Display-only — never used for auth, just so the surface can greet
      // the user by name without re-deriving identity client-side.
      const next = new URL(req.query.next || "/", `${req.protocol}://${req.headers.host}`);
      if (identity.displayName) next.searchParams.set("name", identity.displayName);

      reply.redirect(next.pathname + next.search, 302);
    },
  );
}
