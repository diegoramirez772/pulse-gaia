import { randomUUID } from "node:crypto";
import type { RawContextEvent } from "@pulse/context-schema";

/**
 * Windows Adapter (doc §13): desktop surface, notifications, automation.
 * Same normalization contract as the Android adapter — see the note there.
 */
export function normalizeWindowsEvent(input: {
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
    sourceKind: "windows",
    kind: input.kind,
    payload: input.payload,
    occurredAt: input.occurredAt ?? now,
    receivedAt: now,
  };
}
