import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { normalizeAndroidEvent } from "../adapters/android.js";
import { normalizeWindowsEvent } from "../adapters/windows.js";
import { handleEvent, workGraphMemory } from "../agent-core/index.js";
import { eventBus } from "../event-bus/index.js";

const incomingEventSchema = z.object({
  agentIdentityId: z.string(),
  deviceId: z.string(),
  kind: z.string(),
  payload: z.record(z.unknown()).default({}),
  occurredAt: z.string().datetime().optional(),
});

export async function eventRoutes(app: FastifyInstance) {
  app.post("/events/android", async (req, reply) => {
    const body = incomingEventSchema.parse(req.body);
    const event = normalizeAndroidEvent(body);
    eventBus.publish(event);
    reply.send(await handleEvent(event));
  });

  app.post("/events/windows", async (req, reply) => {
    const body = incomingEventSchema.parse(req.body);
    const event = normalizeWindowsEvent(body);
    eventBus.publish(event);
    reply.send(await handleEvent(event));
  });

  // Demo helper (doc §21): lets the Agent Surface show the Work Graph live.
  app.get("/work-graph", async () => workGraphMemory.snapshot());
}
