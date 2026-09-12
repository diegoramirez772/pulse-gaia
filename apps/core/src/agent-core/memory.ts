import type { ContextEntity, ContextRelation, WorkGraphSnapshot } from "@pulse/context-schema";
import { hasSupabase, supabase } from "../db/supabase.js";

/**
 * Work Graph store, scoped per agent identity (doc §11, §17: the graph
 * belongs to the user/agent, not a single device or session). Persists to
 * Supabase when configured (see Pulse Gaia — Plan de Base de Datos for the
 * `context_entities`/`context_relations` schema); falls back to an
 * in-memory Map per identity otherwise, so local dev needs no database.
 *
 * Entity id resolution (reusing an existing id for the same real-world
 * thing) already happens upstream in context-engine/resolve() — by the
 * time entities reach here they carry the right id, so persisting is a
 * plain upsert by primary key, not a label-matching upsert.
 */
interface MemoryBucket {
  entities: Map<string, ContextEntity>;
  relations: ContextRelation[];
}

const memoryByIdentity = new Map<string, MemoryBucket>();

function bucket(agentIdentityId: string): MemoryBucket {
  let b = memoryByIdentity.get(agentIdentityId);
  if (!b) {
    b = { entities: new Map(), relations: [] };
    memoryByIdentity.set(agentIdentityId, b);
  }
  return b;
}

function toEntityRow(agentIdentityId: string, e: ContextEntity) {
  return {
    id: e.id,
    agent_identity_id: agentIdentityId,
    type: e.type,
    label: e.label,
    attributes: e.attributes,
    source_device_id: e.sourceDeviceId ?? null,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
  };
}

function fromEntityRow(row: Record<string, unknown>): ContextEntity {
  return {
    id: row.id as string,
    type: row.type as ContextEntity["type"],
    label: row.label as string,
    attributes: (row.attributes as Record<string, unknown>) ?? {},
    sourceDeviceId: (row.source_device_id as string | null) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function toRelationRow(agentIdentityId: string, r: ContextRelation) {
  return {
    id: r.id,
    agent_identity_id: agentIdentityId,
    from_entity_id: r.fromEntityId,
    to_entity_id: r.toEntityId,
    predicate: r.predicate,
    attributes: r.attributes ?? null,
    created_at: r.createdAt,
  };
}

function fromRelationRow(row: Record<string, unknown>): ContextRelation {
  return {
    id: row.id as string,
    fromEntityId: row.from_entity_id as string,
    toEntityId: row.to_entity_id as string,
    predicate: row.predicate as string,
    attributes: (row.attributes as Record<string, unknown> | null) ?? undefined,
    createdAt: row.created_at as string,
  };
}

export async function addEntities(agentIdentityId: string, entities: ContextEntity[]): Promise<void> {
  if (entities.length === 0) return;

  if (hasSupabase()) {
    const { error } = await supabase!
      .from("context_entities")
      .upsert(entities.map((e) => toEntityRow(agentIdentityId, e)), { onConflict: "id" });
    if (error) throw new Error(`context_entities upsert failed: ${error.message}`);
    return;
  }

  const b = bucket(agentIdentityId);
  for (const entity of entities) b.entities.set(entity.id, entity);
}

export async function addRelations(agentIdentityId: string, relations: ContextRelation[]): Promise<void> {
  if (relations.length === 0) return;

  if (hasSupabase()) {
    const { error } = await supabase!
      .from("context_relations")
      .upsert(relations.map((r) => toRelationRow(agentIdentityId, r)), { onConflict: "id" });
    if (error) throw new Error(`context_relations upsert failed: ${error.message}`);
    return;
  }

  bucket(agentIdentityId).relations.push(...relations);
}

export async function snapshot(agentIdentityId: string): Promise<WorkGraphSnapshot> {
  if (hasSupabase()) {
    const [{ data: entityRows, error: entityErr }, { data: relationRows, error: relationErr }] = await Promise.all([
      supabase!.from("context_entities").select("*").eq("agent_identity_id", agentIdentityId),
      supabase!.from("context_relations").select("*").eq("agent_identity_id", agentIdentityId),
    ]);
    if (entityErr) throw new Error(`context_entities select failed: ${entityErr.message}`);
    if (relationErr) throw new Error(`context_relations select failed: ${relationErr.message}`);

    return {
      entities: (entityRows ?? []).map(fromEntityRow),
      relations: (relationRows ?? []).map(fromRelationRow),
      asOf: new Date().toISOString(),
    };
  }

  const b = bucket(agentIdentityId);
  return {
    entities: [...b.entities.values()],
    relations: [...b.relations],
    asOf: new Date().toISOString(),
  };
}
