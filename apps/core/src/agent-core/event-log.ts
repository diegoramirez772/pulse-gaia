import type { RawContextEvent } from "@pulse/context-schema";
import { hasSupabase, supabase } from "../db/supabase.js";

/**
 * `pulse_events` (per the teammate's schema, Pulse Gaia — Plan de Base de
 * Datos): a durable log of every raw event, independent of what the
 * pipeline derives from it — the audit trail's starting point
 * (EVENT → CONTEXT → DECISION → PERMISSION → ACTION → AUDIT). Best-effort:
 * a logging failure must never break the actual agent pipeline, so these
 * never throw — just console.error and move on. No in-memory fallback
 * either (unlike the functionally-required stores) — without Supabase
 * there's simply no event log, which is fine for local dev.
 */
export async function recordEventReceived(event: RawContextEvent): Promise<void> {
  if (!hasSupabase()) return;

  const { error } = await supabase!.from("pulse_events").insert({
    id: event.id,
    agent_identity_id: event.agentIdentityId,
    device_id: event.deviceId,
    event_type: event.kind,
    payload: event.payload,
    occurred_at: event.occurredAt,
    received_at: event.receivedAt,
    processing_status: "processing",
  });
  if (error) console.error("[event-log] failed to record event:", error.message);
}

/**
 * `outcome` maps to the table's own two-value terminal state
 * (`processing_status` check constraint only allows
 * 'processing' | 'processed' | 'failed' — found by live probing, since
 * this Supabase project isn't one this session has schema access to).
 * "denied by the firewall" and "threw an error" are both "failed" here;
 * `errorDetail` is what actually distinguishes them.
 */
export async function recordEventProcessed(
  eventId: string,
  outcome: "processed" | "failed",
  errorDetail?: string,
): Promise<void> {
  if (!hasSupabase()) return;

  const { error } = await supabase!
    .from("pulse_events")
    .update({
      processed_at: new Date().toISOString(),
      processing_status: outcome,
      error_detail: errorDetail ?? null,
    })
    .eq("id", eventId);
  if (error) console.error("[event-log] failed to update event:", error.message);
}
