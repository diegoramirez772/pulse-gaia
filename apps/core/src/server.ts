import websocketPlugin from "@fastify/websocket";
import Fastify from "fastify";
import { eventRoutes } from "./routes/events.js";
import { healthRoutes } from "./routes/health.js";
import { wsRoutes } from "./routes/ws.js";

export async function buildServer() {
  const app = Fastify({ logger: true });

  await app.register(websocketPlugin);
  await app.register(healthRoutes);
  await app.register(eventRoutes);
  await app.register(wsRoutes);

  return app;
}
