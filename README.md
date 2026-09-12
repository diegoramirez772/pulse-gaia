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
  surface-web/   Agent Surface prototype — React + Vite (TypeScript)
packages/
  context-schema/  Shared types: events, entities/relations (Work Graph),
                   decisions, capabilities/permissions, surface presentations
adapters/
  android/       Deferred — see adapters/android/README.md
  windows/       Deferred — see adapters/windows/README.md
docs/
  master-doc.md  The full concept document
```

## Status: setup only, no reasoning logic yet

This pass got the whole scaffold installed and wired end-to-end (server
boots, WS broadcasts, surface connects, workspace builds) but deliberately
stopped short of the real logic. Stubbed on purpose, ready to fill in
during the build:

- `context-engine/extract` — turns a raw event into one placeholder entity;
  real NLU/LLM extraction into the Work Graph is next.
- `context-firewall/isAllowed` — always returns `true`; real permission
  checks against `DevicePermissionGrant` come once identity/auth exists.
- `agent-core/reasoning.decide` — always returns `NO_ACTION`; the OpenAI
  client is instantiated and ready, the actual reasoning/tool-use loop
  is not.
- `agent-surface/present` — always renders a `card`; voice/action/
  conversation selection is not implemented.
- Identity (`agent-core/identity.ts`) is a single hardcoded prototype user
  — no real multi-user auth.
- Android/Windows adapters are normalization functions + HTTP routes only
  (`POST /events/android`, `POST /events/windows`) — no native clients.

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
Feed a fake event: `curl -X POST http://localhost:4000/events/android -H 'content-type: application/json' -d '{"agentIdentityId":"prototype-identity","deviceId":"demo-android","kind":"notification.received","payload":{"text":"¿Mañana me pasas la API?"}}'`.

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
