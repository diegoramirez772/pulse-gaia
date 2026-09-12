/**
 * The Work Graph (doc §11): raw events become entities and relations instead
 * of unstructured text, so the Agent Core can reason over "who/what/when"
 * instead of re-reading a conversation.
 */

export type EntityType =
  | "person"
  | "project"
  | "task"
  | "commitment"
  | "document"
  | "message"
  | "device"
  | "custom";

export interface ContextEntity {
  id: string;
  type: EntityType;
  label: string;
  attributes: Record<string, unknown>;
  sourceDeviceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContextRelation {
  id: string;
  fromEntityId: string;
  toEntityId: string;
  /** e.g. "pidio", "espera", "pertenece_a", "necesita" */
  predicate: string;
  attributes?: Record<string, unknown>;
  createdAt: string;
}

export interface WorkGraphSnapshot {
  entities: ContextEntity[];
  relations: ContextRelation[];
  asOf: string;
}
