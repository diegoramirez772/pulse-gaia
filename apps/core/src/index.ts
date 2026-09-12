import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { buildServer } from "./server.js";

// `apps/core` runs with its own cwd as `apps/core/` (pnpm --filter / turbo
// both cd into the package before running its script), so plain
// `dotenv/config` — which reads `.env` from process.cwd() — silently
// never found the repo-root `.env` the README tells you to create. Load
// it explicitly from the monorepo root instead.
loadEnv({ path: join(dirname(fileURLToPath(import.meta.url)), "../../../.env") });

const port = Number(process.env.PORT ?? 4000);

const app = await buildServer();

app
  .listen({ port, host: "0.0.0.0" })
  .then(() => app.log.info(`PULSE Agent Core listening on :${port}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
