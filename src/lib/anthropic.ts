import Anthropic from "@anthropic-ai/sdk";

export const ANTHROPIC_MODEL_OPUS = "claude-opus-4-5";
export const ANTHROPIC_MODEL_SONNET = "claude-sonnet-4-5";
export const isAnthropicConfigured = Boolean(process.env.ANTHROPIC_API_KEY);

let anthropicClient: Anthropic | null = null;

export function getAnthropicClient(): Anthropic | null {
  if (!isAnthropicConfigured) {
    return null;
  }

  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  return anthropicClient;
}
