import { useEffect, useRef, useState } from "react";
import type { WorkGraphSnapshot } from "@pulse/context-schema";

const CORE_HTTP_URL = import.meta.env.VITE_CORE_HTTP_URL ?? "http://localhost:4000";
const CORE_WS_URL = import.meta.env.VITE_CORE_WS_URL ?? "ws://localhost:4000/ws";

type ConnectionState = "connecting" | "online" | "offline";

/**
 * Agent Surface prototype (doc §7-8): a minimal, contextual presence, not a
 * second chat window. This shell wires the plumbing — Core connection,
 * live event stream, Work Graph preview, a text input — the real
 * voice/proactive-card/action presentation logic is the hackathon build.
 */
export function App() {
  const [coreStatus, setCoreStatus] = useState<ConnectionState>("connecting");
  const [workGraph, setWorkGraph] = useState<WorkGraphSnapshot | null>(null);
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    fetch(`${CORE_HTTP_URL}/health`)
      .then((res) => (res.ok ? setCoreStatus("online") : setCoreStatus("offline")))
      .catch(() => setCoreStatus("offline"));

    const ws = new WebSocket(CORE_WS_URL);
    wsRef.current = ws;
    ws.onmessage = (msg) => setLastEvent(msg.data);
    ws.onerror = () => setCoreStatus("offline");

    const poll = setInterval(() => {
      fetch(`${CORE_HTTP_URL}/work-graph`)
        .then((res) => res.json())
        .then(setWorkGraph)
        .catch(() => {});
    }, 3000);

    return () => {
      ws.close();
      clearInterval(poll);
    };
  }, []);

  return (
    <main className="surface-shell">
      <div className="surface-card">
        <header>
          <span className={`status-dot ${coreStatus}`} />
          <span>Agent Core: {coreStatus}</span>
        </header>

        <p className="headline">Nothing needs your attention right now.</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setDraft("");
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask the agent, or say what you're doing…"
          />
          <button type="button" title="Voice input — not wired yet" disabled>
            🎙
          </button>
        </form>

        <footer>
          <span>Work Graph: {workGraph?.entities.length ?? 0} entities</span>
          {lastEvent && <span className="pulse-dot" title={lastEvent} />}
        </footer>
      </div>
    </main>
  );
}
