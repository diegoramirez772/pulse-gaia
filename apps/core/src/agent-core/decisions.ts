import type { AgentDecision } from "@pulse/context-schema";
import { hasSupabase, supabase } from "../db/supabase.js";

/**
 * Decisions need to be looked up later — the "Revisar"/"Confirmar y
 * enviar" buttons in the Agent Surface reference a decisionId and arrive
 * as separate HTTP requests (see routes/decisions.ts), well after the
 * event that produced the decision has finished processing. Looked up by
 * id alone (globally unique) even in Supabase mode — the agentIdentityId
 * is stored for auditability/RLS, not needed to disambiguate a lookup.
 */
const memoryStore = new Map<string, AgentDecision>();

function toRow(agentIdentityId: string, d: AgentDecision) {
  return {
    id: d.id,
    agent_identity_id: agentIdentityId,
    event_id: d.eventId,
    kind: d.kind,
    reasoning: d.reasoning,
    related_entity_ids: d.relatedEntityIds,
    proposed_capability_id: d.proposedCapabilityId ?? null,
    created_at: d.createdAt,
  };
}

function fromRow(row: Record<string, unknown>): AgentDecision {
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    kind: row.kind as AgentDecision["kind"],
    reasoning: row.reasoning as string,
    relatedEntityIds: (row.related_entity_ids as string[]) ?? [],
    proposedCapabilityId: (row.proposed_capability_id as string | null) ?? undefined,
    createdAt: row.created_at as string,
  };
}

export async function saveDecision(agentIdentityId: string, decision: AgentDecision): Promise<AgentDecision> {
  if (hasSupabase()) {
    const { error } = await supabase!.from("agent_decisions").upsert(toRow(agentIdentityId, decision), {
      onConflict: "id",
    });
    if (error) throw new Error(`agent_decisions upsert failed: ${error.message}`);
    return decision;
  }

  memoryStore.set(decision.id, decision);
  return decision;
}

export async function getDecision(id: string): Promise<AgentDecision | undefined> {
  if (hasSupabase()) {
    const { data, error } = await supabase!.from("agent_decisions").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`agent_decisions select failed: ${error.message}`);
    return data ? fromRow(data) : undefined;
  }

  return memoryStore.get(id);
}
