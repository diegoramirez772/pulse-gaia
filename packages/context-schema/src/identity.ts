/**
 * Identity and memory belong to the user/agent, not to a single surface
 * (doc §5, §17): "Your agent follows you, not the app."
 */

export interface AgentIdentity {
  id: string;
  ownerEmail: string;
  displayName: string;
  createdAt: string;
}

export interface LinkedDevice {
  id: string;
  agentIdentityId: string;
  kind: "android" | "windows" | "web" | "other";
  label: string;
  linkedAt: string;
  lastSeenAt?: string;
}
