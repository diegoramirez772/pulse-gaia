import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { draftMessage } from "../agent-core/actions.js";
import { logAction, listActions } from "../agent-core/action-log.js";
import { getDecision, saveDecision } from "../agent-core/decisions.js";
import { PROTOTYPE_IDENTITY_ID } from "../agent-core/identity.js";
import * as workGraph from "../agent-core/memory.js";
import { present, presentActionResult } from "../agent-surface/index.js";
import { eventBus } from "../event-bus/index.js";
import { isCapabilityAllowed } from "../context-firewall/index.js";

const confirmBodySchema = z.object({
  deviceId: z.string().default("unknown"),
  agentIdentityId: z.string().default(PROTOTYPE_IDENTITY_ID),
});

/**
 * The second half of the response cycle (doc §10, steps 7-9) — a card's
 * buttons land here. Two steps mirror the doc §9 script exactly:
 * "Revísalo" (ASK_PERMISSION → drafts a message, becomes EXECUTE) then
 * "Avísale"/confirm (EXECUTE → actually runs, gets logged).
 */
export async function decisionRoutes(app: FastifyInstance) {
  app.post<{ Params: { id: string } }>("/decisions/:id/prepare", async (req, reply) => {
    const decision = await getDecision(req.params.id);
    if (!decision) return reply.code(404).send({ error: "decision not found" });
    if (decision.kind !== "ASK_PERMISSION") {
      return reply.code(409).send({ error: `decision is ${decision.kind}, expected ASK_PERMISSION` });
    }

    const { deviceId, agentIdentityId } = confirmBodySchema.parse(req.body ?? {});
    if (!(await isCapabilityAllowed(agentIdentityId, deviceId, "message.prepare"))) {
      return reply.code(403).send({ error: "message.prepare is not granted for this device" });
    }

    const graph = await workGraph.snapshot(agentIdentityId);
    const draftedText = await draftMessage(decision, graph);
    const nextDecision = {
      id: randomUUID(),
      eventId: decision.eventId,
      kind: "EXECUTE" as const,
      reasoning: draftedText,
      relatedEntityIds: decision.relatedEntityIds,
      proposedCapabilityId: "message.send",
      createdAt: new Date().toISOString(),
    };
    await saveDecision(agentIdentityId, nextDecision);

    const presentation = present(nextDecision);
    eventBus.publishPresentation(presentation);
    reply.send({ decision: nextDecision, presentation });
  });

  app.post<{ Params: { id: string } }>("/decisions/:id/execute", async (req, reply) => {
    const decision = await getDecision(req.params.id);
    if (!decision) return reply.code(404).send({ error: "decision not found" });
    if (decision.kind !== "EXECUTE") {
      return reply.code(409).send({ error: `decision is ${decision.kind}, expected EXECUTE` });
    }

    const { deviceId, agentIdentityId } = confirmBodySchema.parse(req.body ?? {});
    const capabilityKey = decision.proposedCapabilityId ?? "message.send";

    if (!(await isCapabilityAllowed(agentIdentityId, deviceId, capabilityKey))) {
      await logAction(agentIdentityId, {
        decisionId: decision.id,
        capabilityKey,
        deviceId,
        result: "denied",
        detail: "Denied by context firewall: capability is not granted for this device.",
      });
      return reply.code(403).send({ error: `${capabilityKey} is not granted for this device` });
    }

    await logAction(agentIdentityId, {
      decisionId: decision.id,
      capabilityKey,
      deviceId,
      result: "success",
      detail: decision.reasoning,
    });

    const now = new Date().toISOString();
    await workGraph.addEntities(agentIdentityId, [
      {
        id: randomUUID(),
        type: "message",
        label: `Mensaje enviado: ${decision.reasoning.slice(0, 40)}${decision.reasoning.length > 40 ? "..." : ""}`,
        attributes: { text: decision.reasoning, sentVia: capabilityKey },
        sourceDeviceId: deviceId,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const presentation = presentActionResult(decision, decision.reasoning);
    eventBus.publishPresentation(presentation);
    reply.send({ ok: true, presentation });
  });

  app.get<{ Querystring: { agentIdentityId?: string } }>("/action-log", async (req) =>
    listActions(req.query.agentIdentityId ?? PROTOTYPE_IDENTITY_ID),
  );
}
