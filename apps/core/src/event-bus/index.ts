import { EventEmitter } from "node:events";
import type { RawContextEvent } from "@pulse/context-schema";

/**
 * EVENT BUS / CONTEXT LAYER (doc §31). Every OS Adapter publishes normalized
 * events here; the Context Engine is the only subscriber for now. A single
 * in-memory bus is enough for the hackathon prototype — swap for
 * Postgres LISTEN/NOTIFY or a real queue once there's more than one process.
 */
class ContextEventBus extends EventEmitter {
  publish(event: RawContextEvent) {
    this.emit("event", event);
  }

  onEvent(handler: (event: RawContextEvent) => void) {
    this.on("event", handler);
  }
}

export const eventBus = new ContextEventBus();
