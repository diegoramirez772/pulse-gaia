import { describe, expect, it } from "vitest";
import type { RawContextEvent, WorkGraphSnapshot } from "@pulse/context-schema";
import { resolve } from "./index.js";

const event: RawContextEvent = {
  id: "event-1",
  agentIdentityId: "prototype-identity",
  deviceId: "pc-diego",
  sourceKind: "windows",
  kind: "task.status",
  payload: {},
  occurredAt: "2026-09-12T12:00:00.000Z",
  receivedAt: "2026-09-12T12:00:00.000Z",
};

describe("Context Engine resolve", () => {
  it("reuses an existing entity label and resolves relations to its stable id", () => {
    const graph: WorkGraphSnapshot = {
      entities: [
        {
          id: "project-atlas",
          type: "project",
          label: "Proyecto Atlas",
          attributes: { owner: "Diego" },
          sourceDeviceId: "pc-diego",
          createdAt: "2026-09-12T11:00:00.000Z",
          updatedAt: "2026-09-12T11:00:00.000Z",
        },
      ],
      relations: [],
    };

    const result = resolve(
      {
        entities: [
          { type: "project", label: "proyecto atlas", attributes: { status: "active" } },
          { type: "task", label: "PR #184", attributes: { status: "pendiente" } },
        ],
        relations: [{ fromLabel: "PR #184", toLabel: "proyecto atlas", predicate: "pertenece_a" }],
      },
      graph,
      event,
    );

    const project = result.entities.find((entity) => entity.id === "project-atlas");
    const task = result.entities.find((entity) => entity.label === "PR #184");
    expect(project?.attributes).toEqual({ owner: "Diego", status: "active" });
    expect(task).toBeDefined();
    expect(result.relations).toEqual([
      expect.objectContaining({
        fromEntityId: task?.id,
        toEntityId: "project-atlas",
        predicate: "pertenece_a",
      }),
    ]);
  });
});
