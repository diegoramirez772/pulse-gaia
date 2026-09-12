import { randomUUID } from "node:crypto";
import type { RawContextEvent } from "@pulse/context-schema";

/**
 * The Agent Surface's own text input is itself a (very small) adapter
 * (doc §8: "Input: el usuario escribe una instrucción dentro de la Agent
 * Surface") — same normalization contract as android.ts/windows.ts.
 */
export function normalizeWebEvent(input: {
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
    sourceKind: "web",
    kind: input.kind,
    payload: input.payload,
    occurredAt: input.occurredAt ?? now,
    receivedAt: now,
  };
}
