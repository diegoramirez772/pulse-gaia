import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { draftMessage } from "../agent-core/actions.js";
import { logAction, listActions } from "../agent-core/action-log.js";
import { getDecision, saveDecision } from "../agent-core/decisions.js";
import { workGraphMemory } from "../agent-core/memory.js";
import { present, presentActionResult } from "../agent-surface/index.js";
import { eventBus } from "../event-bus/index.js";

const confirmBodySchema = z.object({ deviceId: z.string().default("unknown") });

/**
 * The second half of the response cycle (doc §10, steps 7-9) — a card's
 * buttons land here. Two steps mirror the doc §9 script exactly:
 * "Revísalo" (ASK_PERMISSION → drafts a message, becomes EXECUTE) then
 * "Avísale"/confirm (EXECUTE → actually runs, gets logged).
 */
export async function decisionRoutes(app: FastifyInstance) {
  app.post<{ Params: { id: string } }>("/decisions/:id/prepare", async (req, reply) => {
    const decision = getDecision(req.params.id);
    if (!decision) return reply.code(404).send({ error: "decision not found" });
    if (decision.kind !== "ASK_PERMISSION") {
      return reply.code(409).send({ error: `decision is ${decision.kind}, expected ASK_PERMISSION` });
    }

    const draftedText = await draftMessage(decision, workGraphMemory.snapshot());
    const nextDecision = {
      id: randomUUID(),
      eventId: decision.eventId,
      kind: "EXECUTE" as const,
      reasoning: draftedText,
      relatedEntityIds: decision.relatedEntityIds,
      proposedCapabilityId: "message.send",
      createdAt: new Date().toISOString(),
    };
    saveDecision(nextDecision);

    const presentation = present(nextDecision);
    eventBus.publishPresentation(presentation);
    reply.send({ decision: nextDecision, presentation });
  });

  app.post<{ Params: { id: string } }>("/decisions/:id/execute", async (req, reply) => {
    const decision = getDecision(req.params.id);
    if (!decision) return reply.code(404).send({ error: "decision not found" });
    if (decision.kind !== "EXECUTE") {
      return reply.code(409).send({ error: `decision is ${decision.kind}, expected EXECUTE` });
    }

    const { deviceId } = confirmBodySchema.parse(req.body ?? {});
    const capabilityKey = decision.proposedCapabilityId ?? "message.send";

    logAction({
      decisionId: decision.id,
      capabilityKey,
      deviceId,
      result: "success",
      detail: decision.reasoning,
    });

    const now = new Date().toISOString();
    workGraphMemory.addEntities([
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

  app.get("/action-log", async () => listActions());
}
