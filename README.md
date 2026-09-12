# PULSE / ContextOS

> "AI shouldn't wait for you to talk to it."

The context layer for proactive AI. Not a chatbot, not a multi-device chat
app — a persistent **Agent Core** that keeps identity, memory, context,
permissions and work-state as the user moves across apps, devices and
channels, surfaced through a minimal **Agent Surface** instead of another
chat window.

Full concept doc: [`docs/master-doc.md`](./docs/master-doc.md) (source:
`PULSE_ContextOS_Documento_Maestro_Detallado.docx`). Built for the
"Agents, Everywhere: Bots, Channels, & More" hackathon.

## Architecture

```
DEVICE / APP
  -> OS ADAPTER
    -> EVENT BUS / CONTEXT LAYER
      -> CONTEXT FIREWALL
        -> AGENT CORE (Identity, Memory, Reasoning, Tools, Policy)
          -> AGENT SURFACE (Voice, Text, Context card, Actions)
            -> OS ADAPTER -> ACTION
```

The cycle each event goes through (doc §10): **Detectar → Entender →
Recuperar → Filtrar → Razonar → Decidir → Presentar → Actuar → Registrar**.

## Repo layout

```
apps/
  core/          Agent Core — Fastify + WebSocket (TypeScript/Node)
  surface-web/   Agent Surface prototype — React + Vite (TypeScript), installable PWA
packages/
  context-schema/  Shared types: events, entities/relations (Work Graph),
                   decisions, capabilities/permissions, surface presentations
adapters/
  android/       Deferred — see adapters/android/README.md
  windows/       Deferred — see adapters/windows/README.md
docs/
  master-doc.md  The full concept document
```

## Status: the doc §9 scenario runs for real, end to end

The full response cycle is implemented and was smoke-tested live (no
mocked responses) — this is the exact demo script from the master doc:

- **Context Engine** (`context-engine/extract`) — real: OpenAI structured
  extraction into the Work Graph when `OPENAI_API_KEY` is set, otherwise a
  deterministic reading of an explicit payload contract
  (`text`, `from`, `projectRef`, `taskRef`, `taskStatus` — see
  `routes/events.ts`). Either path resolves labels against the existing
  graph first, so "Proyecto Atlas" stays one node across events instead of
  forking. **Fallback only, not yet real:** free-text NLU without an API
  key — the heuristic path needs those explicit fields.
- **Reasoning** (`agent-core/reasoning.decide`) — real: OpenAI reasons over
  the whole Work Graph (not just the latest event) when a key is present;
  the fallback heuristic reproduces the doc's exact scenario — a person
  waiting on something (`espera` relation) plus a task elsewhere in the
  graph that's pending/blocked — deterministically, no model call needed.
- **Agent Surface** (`agent-surface/present`) — real: picks card/text/action
  by decision kind, with real action buttons wired to real endpoints.
- **Action loop** — real: `POST /decisions/:id/prepare` drafts a message
  (OpenAI or a template, `agent-core/actions.ts`), `POST /decisions/:id/execute`
  runs it, logs to `GET /action-log`, and writes the result back into the
  Work Graph — the "Revisar" → "Confirmar y enviar" flow from doc §9.
- **Multi-device sync** — real: every decision's presentation is broadcast
  over `/ws` to every connected surface, not just the one that triggered it.

**Deliberately still stub or deferred**, and why that's fine for a
hackathon (doc §22, §25 explicitly allow this):

- **Context Firewall** — real, in-memory per-device grants. It starts
  deny-by-default: `POST /devices/:deviceId/grants` explicitly grants or
  revokes a capability, and both incoming context and simulated actions are
  checked. This is intentionally not durable or multi-user until identity and
  storage exist; restart the Core and re-grant permissions.
- Identity (`agent-core/identity.ts`) — single hardcoded prototype user, no
  real multi-user auth.
- Android/Windows adapters — normalization functions + HTTP routes only
  (`POST /events/android`, `POST /events/windows`, `POST /events/web`), no
  native clients. The doc's own guidance: demo real depth on one path,
  present the rest as extensible architecture.
- Voice input — the surface has a mic button, disabled; text input works
  and posts through `POST /events/web`.
- `message.send` doesn't hit a real email/Slack API — it's simulated
  (logged + written into the Work Graph). The doc explicitly says not to
  promise full device/account access for the hackathon.

`surface-web` is a real, installable PWA (manifest + service worker via
`vite-plugin-pwa`, icons in `public/`): `pnpm build` emits
`sw.js`/`manifest.webmanifest` and it installs on desktop/Android/iOS home
screens. Placeholder icons only (dark bg, green pulse mark) — swap
`public/icon-*.png` for real branding whenever that exists. `GET /health`
and `GET /work-graph` are cached network-first so the surface still shows
last-known state on a flaky connection; every `POST` is never cached.

Nothing here fakes data or pretends to be more finished than it is; every
stub above says so at the call site.

## Running it locally

```bash
cp .env.example .env        # fill in OPENAI_API_KEY at minimum
docker compose up -d        # local Postgres
pnpm install
pnpm dev                    # runs core (:4000) + surface-web (:5173) via turbo
```

Health check: `curl http://localhost:4000/health`.

Run the doc §9 scenario end to end (works with or without `OPENAI_API_KEY`
— the heuristic fallback reproduces it deterministically):

```bash
# 0) Explicitly allow the minimum context and action capabilities for this
# demo. Omit or revoke any one of these grants to see the Firewall deny it.
curl -X POST http://localhost:4000/devices/pc-diego/grants -H 'content-type: application/json' -d '{"capabilityKey":"android.notifications.read","granted":true}'
curl -X POST http://localhost:4000/devices/pc-diego/grants -H 'content-type: application/json' -d '{"capabilityKey":"windows.activity.read","granted":true}'
curl -X POST http://localhost:4000/devices/telefono-diego/grants -H 'content-type: application/json' -d '{"capabilityKey":"message.prepare","granted":true}'
curl -X POST http://localhost:4000/devices/telefono-diego/grants -H 'content-type: application/json' -d '{"capabilityKey":"message.send","granted":true}'

# 1) Carlos asks for something, with a deadline
curl -X POST http://localhost:4000/events/android -H 'content-type: application/json' -d '{
  "agentIdentityId":"prototype-identity","deviceId":"pc-diego","kind":"message.received",
  "payload":{"from":"Carlos","text":"¿Mañana me pasas la API?","projectRef":"Proyecto Atlas"}
}'
# -> decision.kind: INFORM

# 2) a PR in the same project shows up pending/blocked
curl -X POST http://localhost:4000/events/windows -H 'content-type: application/json' -d '{
  "agentIdentityId":"prototype-identity","deviceId":"pc-diego","kind":"task.status",
  "payload":{"taskRef":"PR #184","taskStatus":"pendiente, necesita revisión","projectRef":"Proyecto Atlas"}
}'
# -> decision.kind: ASK_PERMISSION, reasoning ties both events together

# 3) "Revísalo" — drafts the message (grab decision.id from step 2's response)
curl -X POST http://localhost:4000/decisions/<decisionId>/prepare -H 'content-type: application/json' -d '{"deviceId":"telefono-diego"}'
# -> decision.kind: EXECUTE, reasoning is now the drafted message

# 4) "Avísale" / confirm — actually runs it (grab the new decision.id from step 3)
curl -X POST http://localhost:4000/decisions/<decisionId>/execute -H 'content-type: application/json' -d '{"deviceId":"telefono-diego"}'

curl http://localhost:4000/action-log   # what got executed
curl http://localhost:4000/work-graph   # the resulting graph
```

Firing step 1 from one browser tab/device and watching step 2's card
appear on a second tab connected to the same `/ws` is the multi-device
"wow moment" from doc §24.

Postgres runs locally via `docker-compose.yml` for now; `DATABASE_URL` in
`.env.example` also accepts a Supabase connection string directly, but no
Supabase project has been provisioned — creating one is a separate,
explicit step (it's a hosted resource, not local setup).

## Build plan (180 min, doc §23)

| Time | Goal | Result |
| --- | --- | --- |
| 0–20 | Agent Core + identity | Core receives events, holds session |
| 20–55 | Context Engine | Events → entities/relations |
| 55–95 | Android Adapter + Surface | Notification → overlay/voice/text |
| 95–125 | PC/Windows surface | Second node/surface |
| 125–145 | Reasoning + action | Detect → ask → execute |
| 145–165 | Multi-device sync | Same context on PC/phone |
| 165–180 | Demo + README | Closed, presentable flow |

## Pitch

30s: "AI agents are becoming capable of doing work, but they still lose
the thread when users move between apps and devices. PULSE is a context
layer for proactive AI. It gives one agent persistent identity, real-time
context, secure permissions and native capabilities across the user's
devices. Instead of opening another chat, the agent appears where the
user is already working, understands what is happening, and acts when it
is useful. Your device changes. Your agent doesn't lose the thread."

10s: "PULSE lets an AI agent follow your work across apps and devices
without losing context."
