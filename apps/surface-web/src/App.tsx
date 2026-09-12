import { useEffect, useRef, useState } from "react";
import type { SurfacePresentation, WorkGraphSnapshot } from "@pulse/context-schema";

const CORE_HTTP_URL = import.meta.env.VITE_CORE_HTTP_URL ?? "http://localhost:4000";
const CORE_WS_URL = import.meta.env.VITE_CORE_WS_URL ?? "ws://localhost:4000/ws";
const AGENT_IDENTITY_ID = "prototype-identity";

type ConnectionState = "connecting" | "online" | "offline";

function getDeviceId(): string {
  try {
    const existing = localStorage.getItem("pulse-device-id");
    if (existing) return existing;
    const id = `web-${crypto.randomUUID().slice(0, 8)}`;
    localStorage.setItem("pulse-device-id", id);
    return id;
  } catch {
    return "web-unknown";
  }
}

/**
 * Agent Surface prototype (doc §7-8): a minimal, contextual presence, not a
 * second chat window. Renders whatever the Agent Core's last decision
 * turned into — card / text / action — and lets the user drive the same
 * "Revisar → Confirmar y enviar" flow from doc §9 with real HTTP calls
 * against the core, not local mock state.
 */
export function App() {
  const [coreStatus, setCoreStatus] = useState<ConnectionState>("connecting");
  const [workGraph, setWorkGraph] = useState<WorkGraphSnapshot | null>(null);
  const [presentation, setPresentation] = useState<SurfacePresentation | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const deviceIdRef = useRef(getDeviceId());

  useEffect(() => {
    fetch(`${CORE_HTTP_URL}/health`)
      .then((res) => setCoreStatus(res.ok ? "online" : "offline"))
      .catch(() => setCoreStatus("offline"));

    const ws = new WebSocket(CORE_WS_URL);
    ws.onopen = () => setCoreStatus("online");
    ws.onerror = () => setCoreStatus("offline");
    ws.onmessage = (msg) => {
      const parsed = JSON.parse(msg.data);
      if (parsed.type === "presentation") setPresentation(parsed.presentation);
      if (parsed.type === "context-event") refreshWorkGraph();
    };

    refreshWorkGraph();
    const poll = setInterval(refreshWorkGraph, 5000);

    function refreshWorkGraph() {
      fetch(`${CORE_HTTP_URL}/work-graph`)
        .then((res) => res.json())
        .then(setWorkGraph)
        .catch(() => {});
    }

    return () => {
      ws.close();
      clearInterval(poll);
    };
  }, []);

  async function submitDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    try {
      await fetch(`${CORE_HTTP_URL}/events/web`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          agentIdentityId: AGENT_IDENTITY_ID,
          deviceId: deviceIdRef.current,
          kind: "manual.note",
          payload: { text: draft },
        }),
      });
      setDraft("");
    } finally {
      setBusy(false);
    }
  }

  async function runAction(capabilityKey?: string) {
    if (!presentation) return;
    if (!capabilityKey) {
      setPresentation(null); // "Descartar" — purely local, no capability requested
      return;
    }
    setBusy(true);
    try {
      const step = capabilityKey === "message.send" ? "execute" : "prepare";
      const res = await fetch(`${CORE_HTTP_URL}/decisions/${presentation.decisionId}/${step}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deviceId: deviceIdRef.current }),
      });
      const data = await res.json();
      if (data.presentation) setPresentation(data.presentation);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="surface-shell">
      <div className="surface-card">
        <header>
          <span className={`status-dot ${coreStatus}`} />
          <span>Agent Core: {coreStatus}</span>
          <span className="device-id">{deviceIdRef.current}</span>
        </header>

        <p className="headline">{presentation?.headline ?? "Nada requiere tu atención por ahora."}</p>
        {presentation?.body && <p className="body-text">{presentation.body}</p>}

        {presentation?.actions && presentation.actions.length > 0 && (
          <div className="action-row">
            {presentation.actions.map((action) => (
              <button
                key={action.id}
                disabled={busy}
                onClick={() => runAction(action.capabilityKey)}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={submitDraft}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask the agent, or say what you're doing…"
            disabled={busy}
          />
          <button type="button" title="Voice input — not wired yet" disabled>
            🎙
          </button>
        </form>

        <footer>
          <span>Work Graph: {workGraph?.entities.length ?? 0} entities</span>
        </footer>
      </div>
    </main>
  );
}
