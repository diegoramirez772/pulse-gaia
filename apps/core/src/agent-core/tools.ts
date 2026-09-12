import type { Capability } from "@pulse/context-schema";

/**
 * Capabilities the Agent Core may request from an OS Adapter (doc §12-13).
 * Register real ones here as adapters gain them (e.g.
 * "android.notifications.read", "windows.clipboard.read", "email.send").
 */
const registry = new Map<string, Capability>();

export function registerCapability(capability: Capability) {
  registry.set(capability.key, capability);
}

export function getCapability(key: string): Capability | undefined {
  return registry.get(key);
}

export function listCapabilities(): Capability[] {
  return [...registry.values()];
}
