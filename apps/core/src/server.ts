import websocketPlugin from "@fastify/websocket";
import Fastify from "fastify";
import { registerDefaultCapabilities } from "./agent-core/tools.js";
import { decisionRoutes } from "./routes/decisions.js";
import { eventRoutes } from "./routes/events.js";
import { healthRoutes } from "./routes/health.js";
import { wsRoutes } from "./routes/ws.js";

export async function buildServer() {
  registerDefaultCapabilities();

  const app = Fastify({ logger: true });

  await app.register(websocketPlugin);
  await app.register(healthRoutes);
  await app.register(eventRoutes);
  await app.register(decisionRoutes);
  await app.register(wsRoutes);

  return app;
}
