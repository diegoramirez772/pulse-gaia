import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { normalizeAndroidEvent } from "../adapters/android.js";
import { normalizeWebEvent } from "../adapters/web.js";
import { normalizeWindowsEvent } from "../adapters/windows.js";
import { handleEvent, workGraph } from "../agent-core/index.js";
import { PROTOTYPE_IDENTITY_ID } from "../agent-core/identity.js";
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
    const result = await handleEvent(event);
    if (!result.skipped) eventBus.publish(event);
    reply.send(result);
  });

  app.post("/events/windows", async (req, reply) => {
    const body = incomingEventSchema.parse(req.body);
    const event = normalizeWindowsEvent(body);
    const result = await handleEvent(event);
    if (!result.skipped) eventBus.publish(event);
    reply.send(result);
  });

  // The Agent Surface's own text input (doc §8) — see adapters/web.ts.
  app.post("/events/web", async (req, reply) => {
    const body = incomingEventSchema.parse(req.body);
    const event = normalizeWebEvent(body);
    const result = await handleEvent(event);
    if (!result.skipped) eventBus.publish(event);
    reply.send(result);
  });

  // Demo helper (doc §21): lets the Agent Surface show the Work Graph live,
  // scoped to whichever identity the surface is resolved as (see routes/auth.ts).
  app.get<{ Querystring: { agentIdentityId?: string } }>("/work-graph", async (req) =>
    workGraph.snapshot(req.query.agentIdentityId ?? PROTOTYPE_IDENTITY_ID),
  );
}
