import { randomUUID } from "node:crypto";
import type { RawContextEvent } from "@pulse/context-schema";

/**
 * Android Adapter (doc §13): notifications, accessibility, voice, floating
 * surfaces. No native client exists yet — this is the normalization
 * boundary it will POST to (see routes/events.ts). Keeping it separate from
 * the Windows adapter means adding another OS later is "add another
 * adapter", not "rebuild the agent" (doc §6).
 */
export function normalizeAndroidEvent(input: {
  agentIdentityId: string;
  deviceId: string;
  kind: string;
  payload: Record<string, unknown>;
  occurredAt?: string;
}): RawContextEvent {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    agentIdentityId: input.agentIdentityId,
    deviceId: input.deviceId,
    sourceKind: "android",
    kind: input.kind,
    payload: input.payload,
    occurredAt: input.occurredAt ?? now,
    receivedAt: now,
  };
}
