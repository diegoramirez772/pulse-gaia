import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

// `apps/core` runs with its own cwd as `apps/core/` (pnpm --filter / turbo
// both cd into the package before running its script), so plain
// `dotenv/config` — which reads `.env` from process.cwd() — silently
// never found the repo-root `.env` the README tells you to create. Load
// it explicitly from the monorepo root instead.
loadEnv({ path: join(dirname(fileURLToPath(import.meta.url)), "../../../.env") });

// Real bug this caught: a *static* `import { buildServer } from "./server.js"`
// at the top of this file gets evaluated — pulling in its entire dependency
// chain, including db/supabase.ts's top-level `createClient(process.env...)`
// — before any of this file's own top-level statements run, per ES module
// import hoisting. That ran createClient() with SUPABASE_URL still
// undefined, no matter how early loadEnv() appeared textually above it.
// Verified live: entities/grants silently landed in the in-memory fallback
// instead of Supabase until this became a dynamic import (which only
// evaluates once actually reached, i.e. after loadEnv() has already run).
const { buildServer } = await import("./server.js");

const port = Number(process.env.PORT ?? 4000);

const app = await buildServer();

app
  .listen({ port, host: "0.0.0.0" })
  .then(() => app.log.info(`PULSE Agent Core listening on :${port}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
