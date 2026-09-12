import type { RawContextEvent } from "@pulse/context-schema";
import { hasSupabase, supabase } from "../db/supabase.js";

/**
 * Context Firewall (doc §12): decides what may cross from a device into the
 * Agent Core. "The agent can know what it needs, without needing to know
 * everything." Deny-by-default, scoped per agent identity + device.
 * Persists to Supabase when configured (`device_capability_grants`, see
 * Pulse Gaia — Plan de Base de Datos); in-memory per identity otherwise.
 */
const eventCapabilityBySource = {
  android: "android.notifications.read",
  windows: "windows.activity.read",
  web: "web.context.write",
  voice: "voice.transcript.read",
  simulated: "simulated.context.read",
} as const;

export function capabilityForEvent(event: RawContextEvent): string {
  return eventCapabilityBySource[event.sourceKind];
}

// In-memory fallback: identity -> device -> granted capability keys.
const memoryGrants = new Map<string, Map<string, Set<string>>>();

function memoryDeviceGrants(agentIdentityId: string, deviceId: string): Set<string> {
  const byDevice = memoryGrants.get(agentIdentityId) ?? new Map<string, Set<string>>();
  memoryGrants.set(agentIdentityId, byDevice);
  const grants = byDevice.get(deviceId) ?? new Set<string>();
  byDevice.set(deviceId, grants);
  return grants;
}

export async function grantCapability(
  agentIdentityId: string,
  deviceId: string,
  capabilityKey: string,
): Promise<void> {
  if (hasSupabase()) {
    const { data: existing, error: selectErr } = await supabase!
      .from("device_capability_grants")
      .select("id")
      .eq("agent_identity_id", agentIdentityId)
      .eq("device_id", deviceId)
      .eq("capability_key", capabilityKey)
      .is("revoked_at", null)
      .maybeSingle();
    if (selectErr) throw new Error(`device_capability_grants select failed: ${selectErr.message}`);
    if (existing) return; // already granted

    const { error: insertErr } = await supabase!.from("device_capability_grants").insert({
      agent_identity_id: agentIdentityId,
      device_id: deviceId,
      capability_key: capabilityKey,
    });
    if (insertErr) throw new Error(`device_capability_grants insert failed: ${insertErr.message}`);
    return;
  }

  memoryDeviceGrants(agentIdentityId, deviceId).add(capabilityKey);
}

export async function revokeCapability(
  agentIdentityId: string,
  deviceId: string,
  capabilityKey: string,
): Promise<void> {
  if (hasSupabase()) {
    const { error } = await supabase!
      .from("device_capability_grants")
      .update({ revoked_at: new Date().toISOString() })
      .eq("agent_identity_id", agentIdentityId)
      .eq("device_id", deviceId)
      .eq("capability_key", capabilityKey)
      .is("revoked_at", null);
    if (error) throw new Error(`device_capability_grants revoke failed: ${error.message}`);
    return;
  }

  memoryDeviceGrants(agentIdentityId, deviceId).delete(capabilityKey);
}

export async function listGrantedCapabilities(agentIdentityId: string, deviceId: string): Promise<string[]> {
  if (hasSupabase()) {
    const { data, error } = await supabase!
      .from("device_capability_grants")
      .select("capability_key")
      .eq("agent_identity_id", agentIdentityId)
      .eq("device_id", deviceId)
      .is("revoked_at", null);
    if (error) throw new Error(`device_capability_grants select failed: ${error.message}`);
    return (data ?? []).map((row) => row.capability_key as string).sort();
  }

  return [...memoryDeviceGrants(agentIdentityId, deviceId)].sort();
}

export async function isCapabilityAllowed(
  agentIdentityId: string,
  deviceId: string,
  capabilityKey: string,
): Promise<boolean> {
  if (hasSupabase()) {
    const { data, error } = await supabase!
      .from("device_capability_grants")
      .select("id")
      .eq("agent_identity_id", agentIdentityId)
      .eq("device_id", deviceId)
      .eq("capability_key", capabilityKey)
      .is("revoked_at", null)
      .maybeSingle();
    if (error) throw new Error(`device_capability_grants select failed: ${error.message}`);
    return Boolean(data);
  }

  return memoryDeviceGrants(agentIdentityId, deviceId).has(capabilityKey);
}

export async function isAllowed(event: RawContextEvent): Promise<boolean> {
  return isCapabilityAllowed(event.agentIdentityId, event.deviceId, capabilityForEvent(event));
}

/**
 * Data minimization pass before anything reaches reasoning/the model.
 * Stub: identity function until real filtering rules exist.
 */
export function minimize<T>(payload: T): T {
  return payload;
}
