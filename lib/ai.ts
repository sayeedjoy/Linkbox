import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { getAppConfig } from "@/lib/app-config";

export async function getCategorizationModel() {
  const config = await getAppConfig();
  const apiKey = config.openrouterApiKey;
  if (!apiKey) return null;

  return createOpenRouter({ apiKey }).chat("google/gemini-2.0-flash-001");
}

export async function isCategorizationEnabled(): Promise<boolean> {
  const config = await getAppConfig();
  return !!config.openrouterApiKey;
}
