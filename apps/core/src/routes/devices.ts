import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  grantCapability,
  listGrantedCapabilities,
  revokeCapability,
} from "../context-firewall/index.js";
import { getIdentity } from "../agent-core/identity.js";
import { requireAgentIdentityId } from "../agent-core/session.js";

const grantBodySchema = z.object({
  capabilityKey: z.string().min(1),
  granted: z.boolean(),
  agentIdentityId: z.string().optional(),
});

/**
 * Demo-sized permission management for the Context Firewall (doc §12).
 * Grants are scoped per (agentIdentityId, deviceId) — see
 * context-firewall/index.ts for the Supabase/in-memory persistence.
 */
export async function deviceRoutes(app: FastifyInstance) {
  app.post<{ Params: { deviceId: string } }>("/devices/:deviceId/grants", async (req, reply) => {
    const body = grantBodySchema.parse(req.body);
    const { capabilityKey, granted } = body;
    const agentIdentityId = await requireAgentIdentityId(req, reply, body.agentIdentityId);
    if (!agentIdentityId) return;

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
    async (req, reply) => {
      const agentIdentityId = await requireAgentIdentityId(req, reply, req.query.agentIdentityId);
      if (!agentIdentityId) return;
      return {
        deviceId: req.params.deviceId,
        grants: await listGrantedCapabilities(agentIdentityId, req.params.deviceId),
      };
    },
  );
}
