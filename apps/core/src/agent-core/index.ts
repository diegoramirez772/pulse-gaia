import type { RawContextEvent } from "@pulse/context-schema";
import { isAllowed, minimize } from "../context-firewall/index.js";
import { extract } from "../context-engine/index.js";
import { workGraphMemory } from "./memory.js";
import { decide } from "./reasoning.js";
import { present } from "../agent-surface/index.js";

/**
 * The full response cycle (doc §10):
 * Detectar → Entender/Recuperar → Filtrar → Razonar → Decidir → Presentar → Actuar → Registrar.
 * "Actuar" (dispatching to an OS Adapter) is intentionally not wired yet —
 * every decision today ends at "Presentar".
 */
export async function handleEvent(event: RawContextEvent) {
  if (!isAllowed(event)) {
    return { skipped: true as const, reason: "denied by context firewall" };
  }

  const safeEvent = { ...event, payload: minimize(event.payload) };

  const { entities, relations } = extract(safeEvent);
  workGraphMemory.addEntities(entities);
  workGraphMemory.addRelations(relations);

  const decision = await decide(safeEvent, entities);
  const presentation = present(decision);

  return { skipped: false as const, decision, presentation };
}

export { workGraphMemory };
