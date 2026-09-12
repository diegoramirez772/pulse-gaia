import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { normalizeAndroidEvent } from "../adapters/android.js";
import { normalizeWebEvent } from "../adapters/web.js";
import { normalizeWindowsEvent } from "../adapters/windows.js";
import { handleEvent, workGraph } from "../agent-core/index.js";
import { deviceIngestAuthorized, requireAgentIdentityId } from "../agent-core/session.js";
import { eventBus } from "../event-bus/index.js";

const incomingEventSchema = z.object({
  agentIdentityId: z.string(),
  deviceId: z.string(),
  kind: z.string(),
  payload: z.record(z.unknown()).default({}),
  occurredAt: z.string().datetime().optional(),
});

const webEventSchema = incomingEventSchema.omit({ agentIdentityId: true }).extend({
  agentIdentityId: z.string().optional(),
});

export async function eventRoutes(app: FastifyInstance) {
  // Device-adapter events (doc §13): no browser session to derive identity
  // from — an OS Adapter authenticates as a device, with a shared secret
  // (DEVICE_INGEST_SECRET), and only then is the agentIdentityId in its
  // body trusted. Fails closed when that secret isn't configured.
  app.post("/events/android", async (req, reply) => {
    if (!deviceIngestAuthorized(req)) return reply.code(401).send({ error: "dispositivo no autorizado" });
    const body = incomingEventSchema.parse(req.body);
    const event = normalizeAndroidEvent(body);
    const result = await handleEvent(event);
    if (!result.skipped) eventBus.publish(event);
    reply.send(result);
  });

  app.post("/events/windows", async (req, reply) => {
    if (!deviceIngestAuthorized(req)) return reply.code(401).send({ error: "dispositivo no autorizado" });
    const body = incomingEventSchema.parse(req.body);
    const event = normalizeWindowsEvent(body);
    const result = await handleEvent(event);
    if (!result.skipped) eventBus.publish(event);
    reply.send(result);
  });

  // The Agent Surface's own text/voice input (doc §8) — a real browser
  // session, so identity comes from the verified handoff cookie only.
  app.post("/events/web", async (req, reply) => {
    const body = webEventSchema.parse(req.body);
    const agentIdentityId = await requireAgentIdentityId(req, reply, body.agentIdentityId);
    if (!agentIdentityId) return;

    const event = normalizeWebEvent({ ...body, agentIdentityId });
    const result = await handleEvent(event);
    if (!result.skipped) eventBus.publish(event);
    reply.send(result);
  });

  // Demo helper (doc §21): the Work Graph of whoever is authenticated —
  // never of whoever a query param claims to be.
  app.get<{ Querystring: { agentIdentityId?: string } }>("/work-graph", async (req, reply) => {
    const agentIdentityId = await requireAgentIdentityId(req, reply, req.query.agentIdentityId);
    if (!agentIdentityId) return;
    return workGraph.snapshot(agentIdentityId);
  });
}
