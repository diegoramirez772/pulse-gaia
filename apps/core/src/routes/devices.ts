import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  grantCapability,
  listGrantedCapabilities,
  revokeCapability,
} from "../context-firewall/index.js";
import { getIdentity, PROTOTYPE_IDENTITY_ID } from "../agent-core/identity.js";

const grantBodySchema = z.object({
  capabilityKey: z.string().min(1),
  granted: z.boolean(),
  agentIdentityId: z.string().default(PROTOTYPE_IDENTITY_ID),
});

/**
 * Demo-sized permission management for the Context Firewall (doc §12).
 * Grants are scoped per (agentIdentityId, deviceId) — see
 * context-firewall/index.ts for the Supabase/in-memory persistence.
 */
export async function deviceRoutes(app: FastifyInstance) {
  app.post<{ Params: { deviceId: string } }>("/devices/:deviceId/grants", async (req) => {
    const { capabilityKey, granted, agentIdentityId } = grantBodySchema.parse(req.body);

    // device_capability_grants.agent_identity_id is a FK — make sure the
    // parent row exists (matters for a brand-new identity granting itself
    // capabilities before it has ever sent an event).
    await getIdentity(agentIdentityId);

    if (granted) await grantCapability(agentIdentityId, req.params.deviceId, capabilityKey);
    else await revokeCapability(agentIdentityId, req.params.deviceId, capabilityKey);

    return {
      deviceId: req.params.deviceId,
      capabilityKey,
      granted,
      grants: await listGrantedCapabilities(agentIdentityId, req.params.deviceId),
    };
  });

  app.get<{ Params: { deviceId: string }; Querystring: { agentIdentityId?: string } }>(
    "/devices/:deviceId/grants",
    async (req) => ({
      deviceId: req.params.deviceId,
      grants: await listGrantedCapabilities(req.query.agentIdentityId ?? PROTOTYPE_IDENTITY_ID, req.params.deviceId),
    }),
  );
}
