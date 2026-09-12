import type { AgentDecision, DecisionKind } from "@pulse/context-schema";

/**
 * Which decisions require the user to confirm before an OS Adapter is
 * allowed to execute them (doc §12: "sensitive actions must require
 * confirmation"). EXECUTE never skips this — ASK_PERMISSION is the gate.
 */
export function requiresConfirmation(kind: DecisionKind): boolean {
  return kind === "EXECUTE";
}

export function canAutoAdvance(decision: AgentDecision): boolean {
  return !requiresConfirmation(decision.kind);
}
