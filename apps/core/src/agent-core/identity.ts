import { randomUUID } from "node:crypto";
import type { AgentIdentity, LinkedDevice } from "@pulse/context-schema";
import { hasSupabase, supabase } from "../db/supabase.js";
import type { HandoffClaims } from "../handeia-auth.js";

/**
 * Identity across every linked device (doc §16-17): "the user is not
 * installing a different chatbot on each device, they are connecting new
 * nodes to their agent." Real identity comes from a Handeia handoff (see
 * routes/auth.ts) — `token.sub` becomes the agentIdentityId. The
 * hardcoded prototype identity stays as the fallback for local dev/testing
 * without going through a handoff.
 */
export const PROTOTYPE_IDENTITY_ID = "prototype-identity";

const memoryIdentities = new Map<string, AgentIdentity>();
const memoryDevices = new Map<string, LinkedDevice>();

function fromIdentityRow(row: Record<string, unknown>): AgentIdentity {
  return {
    id: row.id as string,
    ownerEmail: (row.owner_email as string | null) ?? "",
    displayName: (row.display_name as string | null) ?? row.id as string,
    createdAt: row.created_at as string,
  };
}

async function upsertIdentity(identity: AgentIdentity): Promise<AgentIdentity> {
  if (hasSupabase()) {
    const { error } = await supabase!.from("agent_identities").upsert(
      {
        id: identity.id,
        owner_email: identity.ownerEmail || null,
        display_name: identity.displayName || null,
        created_at: identity.createdAt,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
    if (error) throw new Error(`agent_identities upsert failed: ${error.message}`);
    return identity;
  }

  if (!memoryIdentities.has(identity.id)) memoryIdentities.set(identity.id, identity);
  return memoryIdentities.get(identity.id)!;
}

/** The single hardcoded demo user — used when no Handeia handoff has happened. */
export async function getPrototypeIdentity(): Promise<AgentIdentity> {
  return upsertIdentity({
    id: PROTOTYPE_IDENTITY_ID,
    ownerEmail: "demo@pulse.local",
    displayName: "PULSE Demo User",
    createdAt: new Date().toISOString(),
  });
}

/**
 * Resolves (and persists) the real identity behind a verified handoff
 * token — from either launcher, Handeia (personal) or Gandia
 * (institutional). `sub` is the agentIdentityId either way.
 */
export async function resolveIdentityFromHandoff(claims: HandoffClaims): Promise<AgentIdentity> {
  return upsertIdentity({
    id: claims.sub,
    ownerEmail: claims.email ?? "",
    displayName: claims.name ?? claims.email ?? claims.sub,
    createdAt: new Date().toISOString(),
  });
}

export async function getIdentity(agentIdentityId: string): Promise<AgentIdentity> {
  if (hasSupabase()) {
    const { data, error } = await supabase!
      .from("agent_identities")
      .select("*")
      .eq("id", agentIdentityId)
      .maybeSingle();
    if (error) throw new Error(`agent_identities select failed: ${error.message}`);
    if (data) return fromIdentityRow(data);
  } else if (memoryIdentities.has(agentIdentityId)) {
    return memoryIdentities.get(agentIdentityId)!;
  }

  // Unknown identity (e.g. an agentIdentityId sent directly by an adapter
  // without going through the handoff yet) — register it minimally rather
  // than fail the whole event pipeline over a missing profile.
  return upsertIdentity({
    id: agentIdentityId,
    ownerEmail: "",
    displayName: agentIdentityId,
    createdAt: new Date().toISOString(),
  });
}

export async function linkDevice(
  agentIdentityId: string,
  kind: LinkedDevice["kind"],
  label: string,
): Promise<LinkedDevice> {
  const device: LinkedDevice = {
    id: randomUUID(),
    agentIdentityId,
    kind,
    label,
    linkedAt: new Date().toISOString(),
  };

  if (hasSupabase()) {
    const { error } = await supabase!.from("linked_devices").insert({
      id: device.id,
      agent_identity_id: agentIdentityId,
      kind: device.kind,
      label: device.label,
      linked_at: device.linkedAt,
    });
    if (error) throw new Error(`linked_devices insert failed: ${error.message}`);
    return device;
  }

  memoryDevices.set(device.id, device);
  return device;
}

export async function listLinkedDevices(agentIdentityId: string): Promise<LinkedDevice[]> {
  if (hasSupabase()) {
    const { data, error } = await supabase!
      .from("linked_devices")
      .select("*")
      .eq("agent_identity_id", agentIdentityId);
    if (error) throw new Error(`linked_devices select failed: ${error.message}`);
    return (data ?? []).map((row) => ({
      id: row.id as string,
      agentIdentityId: row.agent_identity_id as string,
      kind: row.kind as LinkedDevice["kind"],
      label: row.label as string,
      linkedAt: row.linked_at as string,
      lastSeenAt: (row.last_seen_at as string | null) ?? undefined,
    }));
  }

  return [...memoryDevices.values()].filter((d) => d.agentIdentityId === agentIdentityId);
}
