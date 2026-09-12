import { randomUUID } from "node:crypto";
import type { AgentIdentity, LinkedDevice } from "@pulse/context-schema";

/**
 * Single shared identity across every linked device (doc §16-17): "the
 * user is not installing a different chatbot on each device, they are
 * connecting new nodes to their agent." Prototype uses one hardcoded
 * identity — replace with real auth (see .env AGENT_IDENTITY_SECRET) once
 * more than one user needs to log in.
 */
const PROTOTYPE_IDENTITY: AgentIdentity = {
  id: "prototype-identity",
  ownerEmail: "demo@pulse.local",
  displayName: "PULSE Demo User",
  createdAt: new Date().toISOString(),
};

const linkedDevices = new Map<string, LinkedDevice>();

export function getIdentity(): AgentIdentity {
  return PROTOTYPE_IDENTITY;
}

export function linkDevice(kind: LinkedDevice["kind"], label: string): LinkedDevice {
  const device: LinkedDevice = {
    id: randomUUID(),
    agentIdentityId: PROTOTYPE_IDENTITY.id,
    kind,
    label,
    linkedAt: new Date().toISOString(),
  };
  linkedDevices.set(device.id, device);
  return device;
}

export function listLinkedDevices(): LinkedDevice[] {
  return [...linkedDevices.values()];
}
