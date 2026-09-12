import type { AgentDecision, WorkGraphSnapshot } from "@pulse/context-schema";
import { hasOpenAI, openai } from "../openai-client.js";

/**
 * The "message.prepare" capability (doc §9: "¿Quieres que prepare un
 * mensaje para el revisor?"). Real OpenAI draft when a key is configured,
 * otherwise a template built from the same entities the decision already
 * points at — still a real, usable draft, just not model-written prose.
 */
export async function draftMessage(decision: AgentDecision, graph: WorkGraphSnapshot): Promise<string> {
  const related = graph.entities.filter((e) => decision.relatedEntityIds.includes(e.id));
  const task = related.find((e) => e.type === "task");
  const person = related.find((e) => e.type === "person");

  if (hasOpenAI()) {
    try {
      const completion = await openai!.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "Write a short, friendly Slack-style message (2-3 sentences, in Spanish) nudging " +
              "a reviewer about a blocked task, based on the context given. No greeting boilerplate " +
              "beyond a quick 'Hola' — get to the point.",
          },
          {
            role: "user",
            content: JSON.stringify({ reasoning: decision.reasoning, task: task?.label, waitingOn: person?.label }),
          },
        ],
      });
      const text = completion.choices[0]?.message?.content?.trim();
      if (text) return text;
    } catch (err) {
      console.error("[actions] OpenAI message draft failed, falling back to template:", err);
    }
  }

  const taskLabel = task?.label ?? "el pendiente";
  const personLabel = person?.label ?? "alguien";
  return `Hola, ¿me ayudas a revisar "${taskLabel}" cuando puedas? ${personLabel} está esperando esto y quedó bloqueado ahí. ¡Gracias!`;
}
