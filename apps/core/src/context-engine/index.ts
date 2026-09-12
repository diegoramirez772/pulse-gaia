import { randomUUID } from "node:crypto";
import type {
  ContextEntity,
  ContextRelation,
  RawContextEvent,
} from "@pulse/context-schema";

/**
 * Context Layer / Work Graph (doc §11): turns a raw event into entities and
 * relations instead of storing unstructured text. This is a stub — the
 * hackathon build plan (§23, minute 20-55) is to replace `extract` with
 * real NLU/LLM-backed extraction against `event.payload`.
 */
export function extract(event: RawContextEvent): {
  entities: ContextEntity[];
  relations: ContextRelation[];
} {
  const now = new Date().toISOString();

  const entity: ContextEntity = {
    id: randomUUID(),
    type: "custom",
    label: `event:${event.kind}`,
    attributes: { ...event.payload },
    sourceDeviceId: event.deviceId,
    createdAt: now,
    updatedAt: now,
  };

  return { entities: [entity], relations: [] };
}
