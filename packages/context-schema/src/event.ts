/**
 * Normalized events entering the Context Layer from any OS Adapter
 * (doc §13). The Agent Core never talks to Android/Windows APIs directly —
 * it only ever sees this shape.
 */

export type EventSourceKind =
  | "android"
  | "windows"
  | "web"
  | "voice"
  | "simulated";

export interface RawContextEvent {
  id: string;
  agentIdentityId: string;
  deviceId: string;
  sourceKind: EventSourceKind;
  /** e.g. "notification.received", "app.focus", "voice.transcript" */
  kind: string;
  payload: Record<string, unknown>;
  occurredAt: string;
  receivedAt: string;
}
