import { useEffect, useRef, useState } from "react";
import type { SurfacePresentation, WorkGraphSnapshot } from "@pulse/context-schema";

const CORE_HTTP_URL = import.meta.env.VITE_CORE_HTTP_URL ?? "http://localhost:4000";
const CORE_WS_URL = import.meta.env.VITE_CORE_WS_URL ?? "ws://localhost:4000/ws";
const PROTOTYPE_IDENTITY_ID = "prototype-identity";

type ConnectionState = "connecting" | "online" | "offline";

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start(): void;
  abort(): void;
}

interface BrowserSpeechRecognitionConstructor {
  new (): BrowserSpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

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
 * Real auth is an httpOnly cookie now (routes/auth.ts, agent-core/session.ts
 * — same "revalidate the signature every request" pattern Nexus uses), not
 * this. `agentIdentityId` here is only a fallback the server accepts when
 * there's no valid cookie (curl-based demo/dev testing) — never trusted on
 * its own for anything the Context Firewall or Work Graph gate.
 */
function getAgentIdentityId(): string {
  try {
    return localStorage.getItem("pulse-agent-identity-id") ?? PROTOTYPE_IDENTITY_ID;
  } catch {
    return PROTOTYPE_IDENTITY_ID;
  }
}

/** Display-only — the handoff redirect passes `?name=` purely to greet the user. */
function getDisplayName(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const name = params.get("name");
    if (name) {
      sessionStorage.setItem("pulse-display-name", name);
      window.history.replaceState({}, "", window.location.pathname);
      return name;
    }
    return sessionStorage.getItem("pulse-display-name");
  } catch {
    return null;
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
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const deviceIdRef = useRef(getDeviceId());
  const agentIdentityIdRef = useRef(getAgentIdentityId());
  const displayNameRef = useRef(getDisplayName());
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  const speechRecognitionSupported =
    typeof window !== "undefined" && Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition);

  useEffect(() => {
    fetch(`${CORE_HTTP_URL}/health`)
      .then((res) => setCoreStatus(res.ok ? "online" : "offline"))
      .catch(() => setCoreStatus("offline"));

    const ws = new WebSocket(CORE_WS_URL);
    ws.onopen = () => setCoreStatus("online");
    ws.onerror = () => setCoreStatus("offline");
    ws.onmessage = (msg) => {
      const parsed = JSON.parse(msg.data);
      if (parsed.type === "presentation") {
        setPresentation(parsed.presentation);
        speakPresentation(parsed.presentation);
      }
      if (parsed.type === "context-event") refreshWorkGraph();
    };

    refreshWorkGraph();
    const poll = setInterval(refreshWorkGraph, 5000);

    function refreshWorkGraph() {
      fetch(`${CORE_HTTP_URL}/work-graph?agentIdentityId=${encodeURIComponent(agentIdentityIdRef.current)}`, {
        credentials: "include",
      })
        .then((res) => res.json())
        .then(setWorkGraph)
        .catch(() => {});
    }

    return () => {
      ws.close();
      clearInterval(poll);
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  function speakPresentation(nextPresentation: SurfacePresentation) {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(nextPresentation.headline);
    utterance.lang = navigator.language || "es-MX";
    window.speechSynthesis.speak(utterance);
  }

  async function sendInput(text: string, kind: "manual.note" | "voice.transcript") {
    setBusy(true);
    setVoiceStatus(null);
    try {
      const res = await fetch(`${CORE_HTTP_URL}/events/web`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          agentIdentityId: agentIdentityIdRef.current,
          deviceId: deviceIdRef.current,
          kind,
          payload: { text },
        }),
      });
      if (!res.ok) throw new Error("El Agent Core rechazó la entrada. Revisa el permiso web.context.write.");
      setDraft("");
    } catch (error) {
      setVoiceStatus(error instanceof Error ? error.message : "No se pudo enviar la entrada.");
    } finally {
      setBusy(false);
    }
  }

  async function submitDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    await sendInput(draft.trim(), "manual.note");
  }

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognition || isListening || busy) return;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = navigator.language || "es-MX";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const result = event.results[event.resultIndex];
      if (!result?.isFinal) return;
      const transcript = result[0].transcript.trim();
      if (transcript) void sendInput(transcript, "voice.transcript");
    };
    recognition.onerror = (event) => {
      setVoiceStatus(`No pude escuchar (${event.error}).`);
    };
    recognition.onend = () => setIsListening(false);

    setVoiceStatus("Escuchando…");
    setIsListening(true);
    recognition.start();
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
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deviceId: deviceIdRef.current, agentIdentityId: agentIdentityIdRef.current }),
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
          <span className="device-id">
            {displayNameRef.current ?? agentIdentityIdRef.current} · {deviceIdRef.current}
          </span>
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
          <button
            className={isListening ? "listening" : ""}
            type="button"
            title={speechRecognitionSupported ? "Hablar con PULSE" : "Tu navegador no soporta reconocimiento de voz"}
            onClick={startListening}
            disabled={busy || !speechRecognitionSupported}
          >
            🎙
          </button>
        </form>
        {voiceStatus && <p className="voice-status" role="status">{voiceStatus}</p>}

        <footer>
          <span>Work Graph: {workGraph?.entities.length ?? 0} entities</span>
        </footer>
      </div>
    </main>
  );
}
