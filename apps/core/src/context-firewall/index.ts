import type { RawContextEvent } from "@pulse/context-schema";

/**
 * Context Firewall (doc §12): decides what may cross from a device into the
 * Agent Core. "The agent can know what it needs, without needing to know
 * everything." Today this is a pass-through stub — real permission checks
 * (per agentIdentityId + deviceId + capabilityKey, against
 * DevicePermissionGrant rows) land once identity/auth is wired.
 */
export function isAllowed(_event: RawContextEvent): boolean {
  return true;
}

/**
 * Data minimization pass before anything reaches reasoning/the model.
 * Stub: identity function until real filtering rules exist.
 */
export function minimize<T>(payload: T): T {
  return payload;
}
