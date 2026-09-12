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

/**
 * The two capabilities the demo scenario (doc §9) actually exercises.
 * Both are simulated — they log to action-log.ts and update the Work
 * Graph, they don't hit a real email/Slack API — see actions.ts and the
 * README for why that's an explicit, stated limitation for the hackathon.
 */
export function registerDefaultCapabilities() {
  registerCapability({
    id: "message.prepare",
    key: "message.prepare",
    description: "Draft a message to unblock a pending task, for the user to review before sending.",
    requiresConfirmation: false,
  });
  registerCapability({
    id: "message.send",
    key: "message.send",
    description: "Send a previously drafted message once the user confirms.",
    requiresConfirmation: true,
  });
}
