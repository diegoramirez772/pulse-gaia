import { EventEmitter } from "node:events";
import type { RawContextEvent, SurfacePresentation } from "@pulse/context-schema";

/**
 * EVENT BUS / CONTEXT LAYER (doc §31). Every OS Adapter publishes normalized
 * events here; every connected Agent Surface subscribes to presentations.
 * A single in-memory bus is enough for the hackathon prototype — swap for
 * Postgres LISTEN/NOTIFY or a real queue once there's more than one process.
 */
class ContextEventBus extends EventEmitter {
  publish(event: RawContextEvent) {
    this.emit("event", event);
  }

  onEvent(handler: (event: RawContextEvent) => void) {
    this.on("event", handler);
  }

  publishPresentation(presentation: SurfacePresentation) {
    this.emit("presentation", presentation);
  }

  onPresentation(handler: (presentation: SurfacePresentation) => void) {
    this.on("presentation", handler);
  }
}

export const eventBus = new ContextEventBus();
