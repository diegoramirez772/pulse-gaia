import type { FastifyInstance } from "fastify";
import { eventBus } from "../event-bus/index.js";

/**
 * Multi-device sync transport (doc §17, §23 minute 145-165): every
 * connected Agent Surface gets the same event stream, so "change of
 * device" is just "another socket subscribed to the same Agent Core".
 */
export async function wsRoutes(app: FastifyInstance) {
  app.get("/ws", { websocket: true }, (socket) => {
    const onEvent = (event: unknown) => {
      socket.send(JSON.stringify({ type: "context-event", event }));
    };

    eventBus.onEvent(onEvent);
    socket.on("close", () => eventBus.off("event", onEvent));
  });
}
