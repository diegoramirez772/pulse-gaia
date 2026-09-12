import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import type { AgentDecision, ContextEntity, RawContextEvent } from "@pulse/context-schema";

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Razonar + Decidir (doc §10, steps 5-6). Stub: always NO_ACTION until the
 * real prompt/tool-use loop against `openai` is built during the hackathon
 * (build plan §23, minute 125-145: "Detectar → preguntar → ejecutar").
 */
export async function decide(
  event: RawContextEvent,
  relatedEntities: ContextEntity[],
): Promise<AgentDecision> {
  return {
    id: randomUUID(),
    eventId: event.id,
    kind: "NO_ACTION",
    reasoning: "stub: reasoning loop not yet implemented",
    relatedEntityIds: relatedEntities.map((e) => e.id),
    createdAt: new Date().toISOString(),
  };
}
