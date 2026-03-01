import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
});

export const categorizationModel = openrouter.chat(
  "google/gemini-2.0-flash-001"
);

export function isCategorizationEnabled(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}
