import { randomUUID } from "node:crypto";
import { z } from "zod";
import type {
  ContextEntity,
  ContextRelation,
  EntityType,
  RawContextEvent,
  WorkGraphSnapshot,
} from "@pulse/context-schema";
import { hasOpenAI, openai } from "../openai-client.js";

interface DraftEntity {
  type: EntityType;
  label: string;
  attributes?: Record<string, unknown>;
}

interface DraftRelation {
  fromLabel: string;
  toLabel: string;
  predicate: string;
}

const extractionResultSchema = z.object({
  entities: z
    .array(
      z.object({
        type: z.enum([
          "person",
          "project",
          "task",
          "commitment",
          "document",
          "message",
          "device",
          "custom",
        ]),
        label: z.string(),
        attributes: z.record(z.unknown()).default({}),
      }),
    )
    .default([]),
  relations: z
    .array(
      z.object({
        fromLabel: z.string(),
        toLabel: z.string(),
        predicate: z.string(),
      }),
    )
    .default([]),
});

/**
 * Context Layer / Work Graph (doc §11): turns a raw event into entities and
 * relations instead of storing unstructured text — "Carlos → pidió → API →
 * pertenece a → Proyecto Atlas → tiene → PR #184 → necesita → revisión".
 *
 * Two paths, same resolution step afterwards:
 * - Real: OpenAI reads `event.payload` and proposes entities/relations.
 * - Fallback (no OPENAI_API_KEY, or the call/parse fails): a deterministic
 *   reading of a small, explicit payload contract
 *   (`text`, `from`, `projectRef`, `taskRef`, `taskStatus`) — enough to
 *   reproduce the doc's exact demo scenario without any model call.
 */
export async function extract(
  event: RawContextEvent,
  graph: WorkGraphSnapshot,
): Promise<{ entities: ContextEntity[]; relations: ContextRelation[] }> {
  const draft = hasOpenAI()
    ? (await extractWithOpenAI(event, graph)) ?? extractWithHeuristics(event)
    : extractWithHeuristics(event);

  return resolve(draft, graph, event);
}

async function extractWithOpenAI(
  event: RawContextEvent,
  graph: WorkGraphSnapshot,
): Promise<{ entities: DraftEntity[]; relations: DraftRelation[] } | null> {
  try {
    const completion = await openai!.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are the Context Engine of PULSE. Turn one raw device event into Work Graph",
            "entities and relations (doc example: Carlos -pidió-> API -pertenece_a-> Proyecto",
            "Atlas -tiene-> PR #184 -necesita-> revisión).",
            "",
            "Reply ONLY with JSON: " +
              '{"entities": [{"type": "person"|"project"|"task"|"commitment"|"document"|' +
              '"message"|"device"|"custom", "label": string, "attributes": object}], ' +
              '"relations": [{"fromLabel": string, "toLabel": string, "predicate": string}]}.',
            "",
            "`predicate` is free text in Spanish (e.g. pidió, espera, pertenece_a, necesita,",
            "estado). Reuse an existing entity's exact label from `existingEntities` when the",
            "event refers to the same real-world thing, instead of inventing a new label.",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({
            existingEntities: graph.entities.map((e) => ({ type: e.type, label: e.label })),
            event: { kind: event.kind, sourceKind: event.sourceKind, payload: event.payload },
          }),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;
    return extractionResultSchema.parse(JSON.parse(content));
  } catch (err) {
    console.error("[context-engine] OpenAI extraction failed, falling back to heuristics:", err);
    return null;
  }
}

/**
 * Deterministic reading of a small explicit payload contract — see
 * apps/core/src/routes/events.ts for the fields this expects
 * (`text`, `from`, `projectRef`, `taskRef`, `taskStatus`).
 */
function extractWithHeuristics(event: RawContextEvent): {
  entities: DraftEntity[];
  relations: DraftRelation[];
} {
  const entities: DraftEntity[] = [];
  const relations: DraftRelation[] = [];
  const payload = event.payload;

  const text = typeof payload.text === "string" ? payload.text : undefined;
  const from = typeof payload.from === "string" ? payload.from.trim() : undefined;
  const projectRef = typeof payload.projectRef === "string" ? payload.projectRef.trim() : undefined;
  const taskRef = typeof payload.taskRef === "string" ? payload.taskRef.trim() : undefined;
  const taskStatus = typeof payload.taskStatus === "string" ? payload.taskStatus : "pendiente";

  const messageLabel = text ? (text.length > 60 ? `${text.slice(0, 57)}...` : text) : undefined;
  if (text && messageLabel) {
    entities.push({ type: "message", label: messageLabel, attributes: { text } });
  }

  if (from) {
    entities.push({ type: "person", label: from });
    if (messageLabel) relations.push({ fromLabel: from, toLabel: messageLabel, predicate: "pidió" });
  }

  const deadlineMatch = text?.match(/\b(mañana|hoy|pasado mañana|esta semana)\b/i);
  if (deadlineMatch) {
    const deadlineLabel = `plazo: ${deadlineMatch[0].toLowerCase()}`;
    entities.push({ type: "commitment", label: deadlineLabel, attributes: { deadline: deadlineMatch[0] } });
    if (from) relations.push({ fromLabel: from, toLabel: deadlineLabel, predicate: "espera" });
  }

  if (projectRef) {
    entities.push({ type: "project", label: projectRef });
    if (messageLabel) relations.push({ fromLabel: messageLabel, toLabel: projectRef, predicate: "pertenece_a" });
  }

  if (taskRef) {
    entities.push({ type: "task", label: taskRef, attributes: { status: taskStatus } });
    if (projectRef) relations.push({ fromLabel: taskRef, toLabel: projectRef, predicate: "pertenece_a" });
  }

  return { entities, relations };
}

/**
 * Resolves labels to entity ids: reuses an existing entity (case-insensitive
 * label match) instead of creating a duplicate every time the same
 * real-world thing is mentioned again, so "Proyecto Atlas" stays one node
 * across events instead of forking the graph.
 */
function resolve(
  draft: { entities: DraftEntity[]; relations: DraftRelation[] },
  graph: WorkGraphSnapshot,
  event: RawContextEvent,
): { entities: ContextEntity[]; relations: ContextRelation[] } {
  const now = new Date().toISOString();
  const idByLabel = new Map(graph.entities.map((e) => [e.label.toLowerCase(), e]));
  const resolvedEntities: ContextEntity[] = [];

  for (const d of draft.entities) {
    const existing = idByLabel.get(d.label.toLowerCase());
    const entity: ContextEntity = existing
      ? {
          ...existing,
          attributes: { ...existing.attributes, ...d.attributes },
          updatedAt: now,
        }
      : {
          id: randomUUID(),
          type: d.type,
          label: d.label,
          attributes: d.attributes ?? {},
          sourceDeviceId: event.deviceId,
          createdAt: now,
          updatedAt: now,
        };
    idByLabel.set(d.label.toLowerCase(), entity);
    resolvedEntities.push(entity);
  }

  const relations: ContextRelation[] = draft.relations
    .map((r): ContextRelation | null => {
      const from = idByLabel.get(r.fromLabel.toLowerCase());
      const to = idByLabel.get(r.toLabel.toLowerCase());
      if (!from || !to) return null;
      return {
        id: randomUUID(),
        fromEntityId: from.id,
        toEntityId: to.id,
        predicate: r.predicate,
        createdAt: now,
      };
    })
    .filter((r): r is ContextRelation => r !== null);

  return { entities: resolvedEntities, relations };
}
