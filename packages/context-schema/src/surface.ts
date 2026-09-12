/**
 * The Agent Surface (doc §7-8): the minimal, contextual way the agent shows
 * up. The conversation is a mechanism, not the product — most presentations
 * are not a chat window.
 */

export type SurfacePresentationKind = "card" | "voice" | "text" | "action" | "conversation";

export interface SurfaceAction {
  id: string;
  label: string;
  /** capability key this action would trigger if confirmed */
  capabilityKey?: string;
}

export interface SurfacePresentation {
  id: string;
  decisionId: string;
  kind: SurfacePresentationKind;
  headline: string;
  body?: string;
  actions?: SurfaceAction[];
  targetDeviceId: string;
  createdAt: string;
}
