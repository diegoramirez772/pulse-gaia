import type { RawContextEvent } from "@pulse/context-schema";

/**
 * Context Firewall (doc §12): decides what may cross from a device into the
 * Agent Core. "The agent can know what it needs, without needing to know
 * everything." The hackathon prototype intentionally stores grants in
 * process memory: they are demonstrable and explicit, but reset on restart
 * until identity/auth and durable storage are added.
 */
const grantsByDevice = new Map<string, Set<string>>();

const eventCapabilityBySource = {
  android: "android.notifications.read",
  windows: "windows.activity.read",
  web: "web.context.write",
  voice: "voice.transcript.read",
  simulated: "simulated.context.read",
} as const;

export function capabilityForEvent(event: RawContextEvent): string {
  return eventCapabilityBySource[event.sourceKind];
}

export function grantCapability(deviceId: string, capabilityKey: string): void {
  const grants = grantsByDevice.get(deviceId) ?? new Set<string>();
  grants.add(capabilityKey);
  grantsByDevice.set(deviceId, grants);
}

export function revokeCapability(deviceId: string, capabilityKey: string): void {
  const grants = grantsByDevice.get(deviceId);
  if (!grants) return;

  grants.delete(capabilityKey);
  if (grants.size === 0) grantsByDevice.delete(deviceId);
}

export function listGrantedCapabilities(deviceId: string): string[] {
  return [...(grantsByDevice.get(deviceId) ?? [])].sort();
}

export function isCapabilityAllowed(deviceId: string, capabilityKey: string): boolean {
  return grantsByDevice.get(deviceId)?.has(capabilityKey) ?? false;
}

export function isAllowed(event: RawContextEvent): boolean {
  return isCapabilityAllowed(event.deviceId, capabilityForEvent(event));
}

/**
 * Data minimization pass before anything reaches reasoning/the model.
 * Stub: identity function until real filtering rules exist.
 */
export function minimize<T>(payload: T): T {
  return payload;
}
