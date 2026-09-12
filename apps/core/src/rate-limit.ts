import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * Small in-memory sliding window per client IP. Not distributed — one
 * process is all this runs on — but enough to stop the actual risk:
 * without it, anyone who finds the URL can loop events and burn OpenAI
 * credit and Supabase rows. Same reason Gandia-7 rate-limits its own
 * bridge routes.
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 120;

const hits = new Map<string, number[]>();

function clientIp(req: FastifyRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]!.trim();
  }
  return req.ip;
}

export function rateLimited(req: FastifyRequest, reply: FastifyReply): boolean {
  const now = Date.now();
  const ip = clientIp(req);
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    hits.set(ip, recent);
    reply.code(429).send({ error: "demasiadas solicitudes, espera un momento" });
    return true;
  }

  recent.push(now);
  hits.set(ip, recent);

  // Bounded cleanup so a long-running process doesn't grow a map entry per
  // IP forever.
  if (hits.size > 5_000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }

  return false;
}
