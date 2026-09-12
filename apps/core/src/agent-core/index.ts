import type { RawContextEvent } from "@pulse/context-schema";
import { isAllowed, minimize } from "../context-firewall/index.js";
import { extract } from "../context-engine/index.js";
import * as workGraph from "./memory.js";
import { decide } from "./reasoning.js";
import { saveDecision } from "./decisions.js";
import { present } from "../agent-surface/index.js";
import { eventBus } from "../event-bus/index.js";

/**
 * The full response cycle (doc §10):
 * Detectar → Entender/Recuperar → Filtrar → Razonar → Decidir → Presentar → Actuar → Registrar.
 * "Actuar" happens later, out of band, when the user confirms a card's
 * action (see routes/decisions.ts) — a decision reaching EXECUTE here
 * doesn't self-execute, it still waits on that confirmation.
 */
export async function handleEvent(event: RawContextEvent) {
  if (!(await isAllowed(event))) {
    return { skipped: true as const, reason: "denied by context firewall" };
  }

  const safeEvent = { ...event, payload: minimize(event.payload) };
  const { agentIdentityId } = safeEvent;

  const priorGraph = await workGraph.snapshot(agentIdentityId);
  const { entities, relations } = await extract(safeEvent, priorGraph);
  await workGraph.addEntities(agentIdentityId, entities);
  await workGraph.addRelations(agentIdentityId, relations);

  const decision = await decide(safeEvent, entities, relations, priorGraph);
  await saveDecision(agentIdentityId, decision);

  const presentation = present(decision);
  eventBus.publishPresentation(presentation);

  return { skipped: false as const, decision, presentation };
}

export { workGraph };
