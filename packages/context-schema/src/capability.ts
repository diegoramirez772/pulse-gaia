/**
 * The Context Firewall (doc §12): explicit permissions decide what may
 * cross from a device into the Agent Core, and what the Core may act on.
 * "The agent can know what it needs, without needing to know everything."
 */

export interface Capability {
  id: string;
  /** e.g. "android.notifications.read", "windows.clipboard.read", "email.send" */
  key: string;
  description: string;
  requiresConfirmation: boolean;
}

export interface DevicePermissionGrant {
  id: string;
  agentIdentityId: string;
  deviceId: string;
  capabilityKey: string;
  grantedAt: string;
  revokedAt?: string;
}

export interface ActionLogEntry {
  id: string;
  decisionId: string;
  capabilityKey: string;
  deviceId: string;
  result: "success" | "failure" | "denied";
  detail?: string;
  createdAt: string;
}
