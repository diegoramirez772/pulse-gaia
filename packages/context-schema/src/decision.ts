/**
 * The response cycle (doc §10): Detectar → Entender → Recuperar → Filtrar →
 * Razonar → Decidir → Presentar → Actuar → Registrar.
 */

export type DecisionKind = "NO_ACTION" | "INFORM" | "ASK_PERMISSION" | "EXECUTE";

export interface AgentDecision {
  id: string;
  eventId: string;
  kind: DecisionKind;
  reasoning: string;
  relatedEntityIds: string[];
  proposedCapabilityId?: string;
  createdAt: string;
}
