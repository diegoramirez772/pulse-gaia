import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  grantCapability,
  listGrantedCapabilities,
  revokeCapability,
} from "../context-firewall/index.js";

const grantBodySchema = z.object({
  capabilityKey: z.string().min(1),
  granted: z.boolean(),
});

/**
 * Demo-sized permission management for the Context Firewall (doc §12).
 * Grants are intentionally in-memory and scoped only to a device because the
 * prototype still has one hardcoded identity; see context-firewall/index.ts.
 */
export async function deviceRoutes(app: FastifyInstance) {
  app.post<{ Params: { deviceId: string } }>("/devices/:deviceId/grants", async (req) => {
    const { capabilityKey, granted } = grantBodySchema.parse(req.body);

    if (granted) grantCapability(req.params.deviceId, capabilityKey);
    else revokeCapability(req.params.deviceId, capabilityKey);

    return {
      deviceId: req.params.deviceId,
      capabilityKey,
      granted,
      grants: listGrantedCapabilities(req.params.deviceId),
    };
  });

  app.get<{ Params: { deviceId: string } }>("/devices/:deviceId/grants", async (req) => ({
    deviceId: req.params.deviceId,
    grants: listGrantedCapabilities(req.params.deviceId),
  }));
}
