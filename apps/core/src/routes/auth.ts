import type { FastifyInstance } from "fastify";
import { resolveIdentityFromHandeia } from "../agent-core/identity.js";
import { verifyHandeiaToken } from "../handeia-auth.js";

/**
 * The handoff endpoint every capability with real auth must implement
 * (doc: Pulse Gaia — Plan Gandia 7 Developers (Handeia), §1 and §3) —
 * Handeia's proxy lands the user here with `?handeia_token=`. No cookie/
 * session plumbing: the resolved identity rides in the redirect's query
 * string, and the surface stores it in localStorage the same way it
 * already stores its own deviceId (see apps/surface-web/src/App.tsx).
 */
export async function authRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { handeia_token?: string } }>("/api/auth/handoff", async (req, reply) => {
    const token = req.query.handeia_token;
    if (!token) return reply.code(400).send({ error: "handeia_token requerido" });

    const secret = process.env.HANDEIA_CAPABILITY_KEY_SECRET;
    if (!secret) return reply.code(500).send({ error: "HANDEIA_CAPABILITY_KEY_SECRET no configurado" });

    const claims = verifyHandeiaToken(token, secret);
    if (!claims) return reply.code(401).send({ error: "token inválido o expirado" });

    const identity = await resolveIdentityFromHandeia(claims);

    const redirectUrl = new URL("/", `${req.protocol}://${req.headers.host}`);
    redirectUrl.searchParams.set("agentIdentityId", identity.id);
    if (identity.displayName) redirectUrl.searchParams.set("name", identity.displayName);

    reply.redirect(redirectUrl.pathname + redirectUrl.search, 302);
  });
}
