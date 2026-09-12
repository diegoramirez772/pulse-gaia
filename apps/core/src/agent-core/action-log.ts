import { randomUUID } from "node:crypto";
import type { ActionLogEntry } from "@pulse/context-schema";
import { hasSupabase, supabase } from "../db/supabase.js";

/**
 * "Registrar" (doc §10, step 9): every executed capability leaves a
 * record, regardless of whether the underlying action was real or
 * simulated (see agent-core/actions.ts). Scoped per agent identity.
 */
const memoryLogs = new Map<string, ActionLogEntry[]>();

function fromRow(row: Record<string, unknown>): ActionLogEntry {
  return {
    id: row.id as string,
    decisionId: row.decision_id as string,
    capabilityKey: row.capability_key as string,
    deviceId: row.device_id as string,
    result: row.result as ActionLogEntry["result"],
    detail: (row.detail as string | null) ?? undefined,
    createdAt: row.created_at as string,
  };
}

export async function logAction(
  agentIdentityId: string,
  entry: Omit<ActionLogEntry, "id" | "createdAt">,
): Promise<ActionLogEntry> {
  const full: ActionLogEntry = { ...entry, id: randomUUID(), createdAt: new Date().toISOString() };

  if (hasSupabase()) {
    const { error } = await supabase!.from("action_log").insert({
      id: full.id,
      agent_identity_id: agentIdentityId,
      decision_id: full.decisionId,
      capability_key: full.capabilityKey,
      device_id: full.deviceId,
      result: full.result,
      detail: full.detail ?? null,
      created_at: full.createdAt,
    });
    if (error) throw new Error(`action_log insert failed: ${error.message}`);
    return full;
  }

  const list = memoryLogs.get(agentIdentityId) ?? [];
  list.push(full);
  memoryLogs.set(agentIdentityId, list);
  return full;
}

export async function listActions(agentIdentityId: string): Promise<ActionLogEntry[]> {
  if (hasSupabase()) {
    const { data, error } = await supabase!
      .from("action_log")
      .select("*")
      .eq("agent_identity_id", agentIdentityId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`action_log select failed: ${error.message}`);
    return (data ?? []).map(fromRow);
  }

  return [...(memoryLogs.get(agentIdentityId) ?? [])];
}
