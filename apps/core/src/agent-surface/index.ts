import { randomUUID } from "node:crypto";
import type { AgentDecision, SurfaceAction, SurfacePresentation } from "@pulse/context-schema";

/**
 * Agent Surface (doc §7-8): picks how a decision shows up. "The
 * conversation is a mechanism, not the product." `targetDeviceId` is
 * "broadcast" because multi-device sync (doc §17) means every connected
 * surface gets the same presentation, not just the one that triggered it.
 */
export function present(decision: AgentDecision): SurfacePresentation {
  const base = {
    id: randomUUID(),
    decisionId: decision.id,
    targetDeviceId: "broadcast",
    createdAt: new Date().toISOString(),
  };

  switch (decision.kind) {
    case "NO_ACTION":
      return { ...base, kind: "card", headline: "Nada requiere tu atención por ahora." };

    case "INFORM":
      return { ...base, kind: "text", headline: decision.reasoning };

    case "ASK_PERMISSION":
      return {
        ...base,
        kind: "card",
        headline: decision.reasoning,
        actions: buildActions(decision, [
          { label: "Revisar", capabilityKey: decision.proposedCapabilityId ?? "message.prepare" },
          { label: "Descartar" },
        ]),
      };

    case "EXECUTE":
      return {
        ...base,
        kind: "action",
        headline: decision.reasoning,
        actions: buildActions(decision, [
          { label: "Confirmar y enviar", capabilityKey: decision.proposedCapabilityId ?? "message.send" },
          { label: "Descartar" },
        ]),
      };
  }
}

/** Follow-up presentation once a confirmed action actually ran (routes/decisions.ts). */
export function presentActionResult(decision: AgentDecision, detail: string): SurfacePresentation {
  return {
    id: randomUUID(),
    decisionId: decision.id,
    kind: "text",
    headline: "Listo — acción completada.",
    body: detail,
    targetDeviceId: "broadcast",
    createdAt: new Date().toISOString(),
  };
}

function buildActions(
  decision: AgentDecision,
  specs: Array<{ label: string; capabilityKey?: string }>,
): SurfaceAction[] {
  return specs.map((spec, i) => ({
    id: `${decision.id}:${i}`,
    label: spec.label,
    capabilityKey: spec.capabilityKey,
  }));
}
