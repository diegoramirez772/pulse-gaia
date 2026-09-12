import OpenAI from "openai";

export const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Every LLM-backed step (context extraction, reasoning, message drafting)
 * checks this first and falls back to a deterministic rule instead of
 * failing — no API key (or an OpenAI outage at the venue) shouldn't kill
 * the demo, it should just make it dumber.
 */
export function hasOpenAI(): boolean {
  return openai !== null;
}
