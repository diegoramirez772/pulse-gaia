import websocketPlugin from "@fastify/websocket";
import Fastify from "fastify";
import { registerDefaultCapabilities } from "./agent-core/tools.js";
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
  await app.register(deviceRoutes);
  await app.register(eventRoutes);
  await app.register(decisionRoutes);
  await app.register(wsRoutes);

  return app;
}
