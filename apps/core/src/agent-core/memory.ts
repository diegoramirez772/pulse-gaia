import type { ContextEntity, ContextRelation } from "@pulse/context-schema";

/**
 * In-memory Work Graph store for the prototype. Swap for the Postgres
 * schema (see apps/core/src/db) once persistence is wired — the shape
 * (entities + relations) is already the schema in @pulse/context-schema.
 */
class WorkGraphMemory {
  private entities = new Map<string, ContextEntity>();
  private relations: ContextRelation[] = [];

  addEntities(entities: ContextEntity[]) {
    for (const entity of entities) this.entities.set(entity.id, entity);
  }

  addRelations(relations: ContextRelation[]) {
    this.relations.push(...relations);
  }

  snapshot() {
    return {
      entities: [...this.entities.values()],
      relations: [...this.relations],
      asOf: new Date().toISOString(),
    };
  }
}

export const workGraphMemory = new WorkGraphMemory();
