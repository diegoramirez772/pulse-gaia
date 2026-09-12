import { randomUUID } from "node:crypto";
import type { ActionLogEntry } from "@pulse/context-schema";

/**
 * "Registrar" (doc §10, step 9): every executed capability leaves a
 * record, regardless of whether the underlying action was real or
 * simulated (see agent-core/actions.ts).
 */
const log: ActionLogEntry[] = [];

export function logAction(entry: Omit<ActionLogEntry, "id" | "createdAt">): ActionLogEntry {
  const full: ActionLogEntry = { ...entry, id: randomUUID(), createdAt: new Date().toISOString() };
  log.push(full);
  return full;
}

export function listActions(): ActionLogEntry[] {
  return [...log];
}
