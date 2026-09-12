import type { AgentDecision } from "@pulse/context-schema";

/**
 * Decisions need to be looked up later — the "Revisar"/"Confirmar y
 * enviar" buttons in the Agent Surface reference a decisionId and arrive
 * as separate HTTP requests (see routes/decisions.ts), well after the
 * event that produced the decision has finished processing.
 */
const store = new Map<string, AgentDecision>();

export function saveDecision(decision: AgentDecision): AgentDecision {
  store.set(decision.id, decision);
  return decision;
}

export function getDecision(id: string): AgentDecision | undefined {
  return store.get(id);
}
