import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { normalizeAndroidEvent } from "../adapters/android.js";
import { normalizeWebEvent } from "../adapters/web.js";
import { normalizeWindowsEvent } from "../adapters/windows.js";
import { handleEvent, workGraph } from "../agent-core/index.js";
import { resolveAgentIdentityId } from "../agent-core/session.js";
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
  // Device-adapter events (doc §13): there's no browser session to derive
  // identity from here — an OS Adapter authenticates as a device, not as a
  // logged-in browser — so agentIdentityId is trusted as given. Real
  // device-to-Core auth (pairing secrets, etc.) isn't built yet; this is a
  // documented, deliberate gap, not an oversight (see README Status).
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

  // The Agent Surface's own text/voice input (doc §8) — a real browser
  // session, so identity comes from the verified handoff cookie, not
  // whatever the request body claims (see agent-core/session.ts). The body
  // field is only a fallback for the curl-based demo flow, which has no
  // cookie.
  app.post("/events/web", async (req, reply) => {
    const body = webEventSchema.parse(req.body);
    const agentIdentityId = await resolveAgentIdentityId(req, body.agentIdentityId);
    const event = normalizeWebEvent({ ...body, agentIdentityId });
    const result = await handleEvent(event);
    if (!result.skipped) eventBus.publish(event);
    reply.send(result);
  });

  // Demo helper (doc §21): lets the Agent Surface show the Work Graph live,
  // scoped to whichever identity the request resolves to.
  app.get<{ Querystring: { agentIdentityId?: string } }>("/work-graph", async (req) =>
    workGraph.snapshot(await resolveAgentIdentityId(req, req.query.agentIdentityId)),
  );
}
