import { describe, expect, it } from "vitest";
import type { ContextEntity, WorkGraphSnapshot } from "@pulse/context-schema";
import { decideWithHeuristics } from "./reasoning.js";

const person: ContextEntity = {
  id: "carlos",
  type: "person",
  label: "Carlos",
  attributes: {},
  sourceDeviceId: "pc-diego",
  createdAt: "2026-09-12T12:00:00.000Z",
  updatedAt: "2026-09-12T12:00:00.000Z",
};

const commitment: ContextEntity = {
  id: "tomorrow",
  type: "commitment",
  label: "plazo: mañana",
  attributes: { deadline: "mañana" },
  sourceDeviceId: "pc-diego",
  createdAt: "2026-09-12T12:00:00.000Z",
  updatedAt: "2026-09-12T12:00:00.000Z",
};

const blockedTask: ContextEntity = {
  id: "pr-184",
  type: "task",
  label: "PR #184",
  attributes: { status: "pendiente, necesita revisión" },
  sourceDeviceId: "pc-diego",
  createdAt: "2026-09-12T12:01:00.000Z",
  updatedAt: "2026-09-12T12:01:00.000Z",
};

describe("Agent Core heuristic reasoning", () => {
  it("asks permission when a new blocked task completes Carlos's existing commitment", () => {
    const graph: WorkGraphSnapshot = {
      entities: [person, commitment],
      relations: [
        {
          id: "carlos-waits",
          fromEntityId: person.id,
          toEntityId: commitment.id,
          predicate: "espera",
          createdAt: "2026-09-12T12:00:00.000Z",
        },
      ],
      asOf: "2026-09-12T12:00:00.000Z",
    };

    const result = decideWithHeuristics([blockedTask], [], graph);

    expect(result.kind).toBe("ASK_PERMISSION");
    expect(result.proposedCapabilityId).toBe("message.prepare");
    expect(result.relatedEntityLabels).toEqual(["Carlos", "plazo: mañana", "PR #184"]);
  });

  it("does not surface a stale task when an unrelated event arrives", () => {
    const graph: WorkGraphSnapshot = {
      entities: [person, commitment, blockedTask],
      relations: [
        {
          id: "carlos-waits",
          fromEntityId: person.id,
          toEntityId: commitment.id,
          predicate: "espera",
          createdAt: "2026-09-12T12:00:00.000Z",
        },
      ],
      asOf: "2026-09-12T12:00:00.000Z",
    };
    const unrelated: ContextEntity = {
      ...blockedTask,
      id: "other-message",
      type: "message",
      label: "Nota independiente",
      attributes: {},
    };

    expect(decideWithHeuristics([unrelated], [], graph).kind).toBe("NO_ACTION");
  });
});
