import type { Answer } from "../domain/assistant";
import type { StateRef } from "../domain/types";
export interface Usage {
  promptTokens: number;
  completionTokens: number;
  cost: number | null;
  calls: number;
}
export interface AssistantReply {
  contextId?: string;
  answer: Answer;
  mode: "llm" | "deterministic";
  reason: string | null;
  retrievalMode: "keyword" | "hybrid";
  semanticStatus?: "ready" | "semantic_unavailable";
  generationMode?: "grounded" | "extractive" | "tools";
  stateRef: StateRef;
  usage: Usage;
}
