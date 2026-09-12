import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import staticPlugin from "@fastify/static";
import websocketPlugin from "@fastify/websocket";
import Fastify from "fastify";
import { registerDefaultCapabilities } from "./agent-core/tools.js";
import { authRoutes } from "./routes/auth.js";
import { decisionRoutes } from "./routes/decisions.js";
import { deviceRoutes } from "./routes/devices.js";
import { eventRoutes } from "./routes/events.js";
import { healthRoutes } from "./routes/health.js";
import { wsRoutes } from "./routes/ws.js";

function configuredOrigins(): Set<string> {
  return new Set(
    (process.env.CORS_ORIGIN ?? "http://localhost:5173")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

// apps/core/dist/server.js -> ../../surface-web/dist. Serving the Agent
// Surface's static build from the same Fastify instance means the whole
// app is ONE deployable target — which is what Handeia's proxy needs (see
// Pulse Gaia — Plan Gandia 7 Developers (Handeia) §1: it resolves a slug to
// a single backend_url/iframe_url and reverse-proxies straight to it).
const surfaceWebDist = join(dirname(fileURLToPath(import.meta.url)), "../../surface-web/dist");

export async function buildServer() {
  registerDefaultCapabilities();

  const app = Fastify({ logger: true });
  const allowedOrigins = configuredOrigins();

  // The PWA is commonly served from a different origin in the demo. Keep the
  // list explicit so deployed surfaces can call the Core without opening it
  // to arbitrary browser origins.
  app.addHook("onRequest", async (request, reply) => {
    const origin = request.headers.origin;
    if (origin && allowedOrigins.has(origin)) {
      reply.header("Access-Control-Allow-Origin", origin);
      reply.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      reply.header("Access-Control-Allow-Headers", "Content-Type");
      reply.header("Vary", "Origin");
    }

    if (request.method === "OPTIONS") return reply.code(204).send();
  });

  await app.register(websocketPlugin);
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(deviceRoutes);
  await app.register(eventRoutes);
  await app.register(decisionRoutes);
  await app.register(wsRoutes);

  // Only when the surface's static build actually exists (production/deploy
  // image) — local `pnpm dev` runs the surface separately via Vite on :5173
  // and this directory won't be there, which is fine.
  if (existsSync(surfaceWebDist)) {
    await app.register(staticPlugin, { root: surfaceWebDist, wildcard: false });
    app.setNotFoundHandler((request, reply) => {
      if (request.method === "GET" && !request.url.startsWith("/api")) {
        return reply.sendFile("index.html", surfaceWebDist);
      }
      reply.code(404).send({ error: "not found" });
    });
  }

  return app;
}
