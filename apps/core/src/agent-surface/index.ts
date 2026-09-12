import { randomUUID } from "node:crypto";
import type { AgentDecision, SurfacePresentation } from "@pulse/context-schema";

/**
 * Agent Surface (doc §7-8): picks how the decision shows up. "The
 * conversation is a mechanism, not the product." Stub always renders a
 * card — voice/action/conversation selection logic is part of the
 * hackathon build (build plan §23, minute 55-95).
 */
export function present(decision: AgentDecision): SurfacePresentation {
  return {
    id: randomUUID(),
    decisionId: decision.id,
    kind: "card",
    headline:
      decision.kind === "NO_ACTION" ? "Nothing needs your attention" : decision.reasoning,
    targetDeviceId: "unknown",
    createdAt: new Date().toISOString(),
  };
}
