import { randomUUID } from "node:crypto";
import { z } from "zod";
import type {
  AgentDecision,
  ContextEntity,
  ContextRelation,
  DecisionKind,
  RawContextEvent,
  WorkGraphSnapshot,
} from "@pulse/context-schema";
import { hasOpenAI, openai } from "../openai-client.js";

const decisionResultSchema = z.object({
  kind: z.enum(["NO_ACTION", "INFORM", "ASK_PERMISSION", "EXECUTE"]),
  reasoning: z.string(),
  relatedEntityLabels: z.array(z.string()).default([]),
  proposedCapabilityId: z.string().optional(),
});

/**
 * Razonar + Decidir (doc §10, steps 5-6; doc §9's Carlos/API example is the
 * target scenario). Two paths:
 *
 * - Real: sends the relevant slice of the Work Graph + the new event to
 *   OpenAI and asks for a structured decision.
 * - Fallback (no OPENAI_API_KEY, or the model call/parse fails): a small
 *   deterministic rule that reproduces the one scenario the doc actually
 *   asks for — a person is waiting on something, and there's already a
 *   pending/blocked task connected to it — so the pipeline is fully
 *   demoable without a key.
 */
export async function decide(
  event: RawContextEvent,
  newEntities: ContextEntity[],
  newRelations: ContextRelation[],
  graph: WorkGraphSnapshot,
): Promise<AgentDecision> {
  if (hasOpenAI()) {
    const llmDecision = await decideWithOpenAI(newEntities, newRelations, graph);
    if (llmDecision) return toDecision(event, llmDecision, graph, newEntities);
  }

  return toDecision(
    event,
    decideWithHeuristics(newEntities, newRelations, graph),
    graph,
    newEntities,
  );
}

async function decideWithOpenAI(
  newEntities: ContextEntity[],
  newRelations: ContextRelation[],
  graph: WorkGraphSnapshot,
): Promise<z.infer<typeof decisionResultSchema> | null> {
  try {
    const completion = await openai!.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are the reasoning step of PULSE, a context layer for a proactive AI agent.",
            "You receive the user's Work Graph (entities + relations already known) and the",
            "entities/relations extracted from the newest event. Decide what the agent should do.",
            "",
            "Reply ONLY with a JSON object: " +
              '{"kind": "NO_ACTION"|"INFORM"|"ASK_PERMISSION"|"EXECUTE", "reasoning": string, ' +
              '"relatedEntityLabels": string[], "proposedCapabilityId"?: string}.',
            "",
            "Rules:",
            "- NO_ACTION: nothing new or relevant enough to surface.",
            "- INFORM: worth telling the user, no action needed from them.",
            "- ASK_PERMISSION: something needs the user's attention and a yes/no decision",
            '  before the agent goes further (propose "message.prepare" as the capability).',
            "- EXECUTE: only when a prior ASK_PERMISSION was already confirmed by the user",
            '  (propose "message.send").',
            "- `reasoning` is what gets shown to the user directly — write it exactly like the",
            "  doc's example: \"Carlos espera la API mañana. Encontré trabajo relacionado que",
            '  sigue pendiente. ¿Quieres que revise qué falta?" — concrete, using the real',
            "  entity labels you were given, not generic.",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({
            workGraph: { entities: graph.entities, relations: graph.relations },
            newEntities,
            newRelations,
          }),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;
    return decisionResultSchema.parse(JSON.parse(content));
  } catch (err) {
    console.error("[reasoning] OpenAI decision failed, falling back to heuristics:", err);
    return null;
  }
}

/**
 * Deterministic version of the same rule an LLM would apply for the demo
 * scenario (doc §9): a person is waiting on a commitment (an "espera"
 * relation, wherever it was created), and the graph — old or new — has a
 * task/PR connected to that thread that's pending or needs review. This
 * reasons over the *whole* Work Graph, not just this event's own entities,
 * because the two halves of the scenario routinely arrive as separate
 * events (Carlos's message, then the PR status, in either order).
 */
export function decideWithHeuristics(
  newEntities: ContextEntity[],
  newRelations: ContextRelation[],
  graph: WorkGraphSnapshot,
): z.infer<typeof decisionResultSchema> {
  const newIds = new Set(newEntities.map((e) => e.id));
  const byId = new Map([...graph.entities, ...newEntities].map((e) => [e.id, e]));
  const allRelations = [...graph.relations, ...newRelations];

  const esperaRelation = allRelations.find((r) => r.predicate === "espera");
  const person = esperaRelation && byId.get(esperaRelation.fromEntityId);
  const waitingCommitment = esperaRelation && byId.get(esperaRelation.toEntityId);

  const blockedTask = [...byId.values()].find(
    (e) =>
      (e.type === "task" || e.type === "document") &&
      typeof e.attributes.status === "string" &&
      /pendiente|bloquead|needs.review|pending/i.test(e.attributes.status),
  );

  // Only surface the combo if *this* event is what completes it — otherwise
  // an unrelated later event would keep re-triggering the same reminder.
  const thisEventCompletesIt =
    (blockedTask && newIds.has(blockedTask.id)) ||
    (person && newIds.has(person.id)) ||
    (waitingCommitment && newIds.has(waitingCommitment.id));

  if (person && waitingCommitment && blockedTask && thisEventCompletesIt) {
    return {
      kind: "ASK_PERMISSION",
      reasoning: `${person.label} espera "${waitingCommitment.label}". Encontré trabajo relacionado que sigue pendiente: "${blockedTask.label}". ¿Quieres que revise qué falta?`,
      relatedEntityLabels: [person.label, waitingCommitment.label, blockedTask.label],
      proposedCapabilityId: "message.prepare",
    };
  }

  const newCommitment = newEntities.find((e) => e.type === "commitment");
  if (newCommitment) {
    const relatedPerson = allRelations.find(
      (r) => r.predicate === "espera" && r.toEntityId === newCommitment.id,
    );
    const who = relatedPerson && byId.get(relatedPerson.fromEntityId);
    return {
      kind: "INFORM",
      reasoning: who
        ? `Nuevo compromiso detectado: ${who.label} espera "${newCommitment.label}".`
        : `Nuevo compromiso detectado: "${newCommitment.label}".`,
      relatedEntityLabels: who ? [who.label, newCommitment.label] : [newCommitment.label],
    };
  }

  return {
    kind: "NO_ACTION",
    reasoning: "Nada requiere tu atención por ahora.",
    relatedEntityLabels: [],
  };
}

function toDecision(
  event: RawContextEvent,
  result: z.infer<typeof decisionResultSchema>,
  graph: WorkGraphSnapshot,
  newEntities: ContextEntity[],
): AgentDecision {
  const byLabel = new Map(
    [...graph.entities, ...newEntities].map((e) => [e.label.toLowerCase(), e.id]),
  );
  const relatedEntityIds = result.relatedEntityLabels
    .map((label) => byLabel.get(label.toLowerCase()))
    .filter((id): id is string => Boolean(id));

  return {
    id: randomUUID(),
    eventId: event.id,
    kind: result.kind as DecisionKind,
    reasoning: result.reasoning,
    relatedEntityIds,
    proposedCapabilityId: result.proposedCapabilityId,
    createdAt: new Date().toISOString(),
  };
}
