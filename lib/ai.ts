import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createGroq } from "@ai-sdk/groq";
import { getAppConfig } from "@/lib/app-config";

export async function getCategorizationModel() {
  const config = await getAppConfig();
  const provider = config.aiProvider;
  const model = config.aiModel;

  if (provider === "groq") {
    const apiKey = config.groqApiKey;
    if (!apiKey) return null;
    return createGroq({ apiKey })(model);
  }

  const apiKey = config.openrouterApiKey;
  if (!apiKey) return null;
  return createOpenRouter({ apiKey }).chat(model);
}

export async function isCategorizationEnabled(): Promise<boolean> {
  const config = await getAppConfig();
  return config.aiProvider === "groq"
    ? !!config.groqApiKey
    : !!config.openrouterApiKey;
}
