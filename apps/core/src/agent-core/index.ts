import type { RawContextEvent } from "@pulse/context-schema";
import { isAllowed, minimize } from "../context-firewall/index.js";
import { extract } from "../context-engine/index.js";
import { workGraphMemory } from "./memory.js";
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
  if (!isAllowed(event)) {
    return { skipped: true as const, reason: "denied by context firewall" };
  }

  const safeEvent = { ...event, payload: minimize(event.payload) };

  const priorGraph = workGraphMemory.snapshot();
  const { entities, relations } = await extract(safeEvent, priorGraph);
  workGraphMemory.addEntities(entities);
  workGraphMemory.addRelations(relations);

  const decision = await decide(safeEvent, entities, relations, priorGraph);
  saveDecision(decision);

  const presentation = present(decision);
  eventBus.publishPresentation(presentation);

  return { skipped: false as const, decision, presentation };
}

export { workGraphMemory };
