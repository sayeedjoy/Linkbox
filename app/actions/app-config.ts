"use server";

import { count } from "drizzle-orm";
import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createGroq } from "@ai-sdk/groq";
import { requireAdminSession } from "@/lib/admin";
import { db, users } from "@/lib/db";
import {
  AppConfigMigrationRequiredError,
  getAppConfig,
  setServiceConfig,
  setPublicSignupEnabled,
} from "@/lib/app-config";

export async function updatePublicSignupEnabled(
  enabled: boolean
): Promise<
  | { success: true; publicSignupEnabled: boolean }
  | { success: false; error: string }
> {
  try {
    await requireAdminSession();
    if (!enabled) {
      const [{ value: totalUsers }] = await db.select({ value: count() }).from(users);
      if (totalUsers <= 1) {
        return {
          success: false as const,
          error: "Public signup cannot be disabled while only one account exists.",
        };
      }
    }

    const config = await setPublicSignupEnabled(enabled);
    return {
      success: true as const,
      publicSignupEnabled: config.publicSignupEnabled,
    };
  } catch (error) {
    if (error instanceof AppConfigMigrationRequiredError) {
      return { success: false as const, error: error.message };
    }

    return { success: false as const, error: "Failed to update signup setting" };
  }
}

export async function updateServiceConfig(input: {
  aiProvider?: "openrouter" | "groq";
  aiModel?: string;
  openrouterApiKey?: string;
  clearOpenrouterApiKey?: boolean;
  groqApiKey?: string;
  clearGroqApiKey?: boolean;
  resendApiKey?: string;
  clearResendApiKey?: boolean;
  resendFromEmail?: string;
}): Promise<
  | {
      success: true;
      aiProvider: "openrouter" | "groq";
      aiModel: string;
      openrouterConfigured: boolean;
      groqConfigured: boolean;
      resendConfigured: boolean;
      resendFromEmail: string;
    }
  | { success: false; error: string }
> {
  try {
    await requireAdminSession();

    if (
      input.aiProvider !== undefined &&
      input.aiProvider !== "openrouter" &&
      input.aiProvider !== "groq"
    ) {
      return { success: false, error: "Invalid AI provider." };
    }

    const aiModel = input.aiModel?.trim();
    if (aiModel !== undefined && aiModel.length > 0 && aiModel.length > 120) {
      return { success: false, error: "Model name is too long." };
    }

    const resendFromEmail = input.resendFromEmail?.trim();
    if (
      resendFromEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resendFromEmail)
    ) {
      return { success: false, error: "Enter a valid Resend sender email." };
    }

    const config = await setServiceConfig({
      aiProvider: input.aiProvider,
      aiModel,
      openrouterApiKey: input.openrouterApiKey,
      clearOpenrouterApiKey: input.clearOpenrouterApiKey,
      groqApiKey: input.groqApiKey,
      clearGroqApiKey: input.clearGroqApiKey,
      resendApiKey: input.resendApiKey,
      clearResendApiKey: input.clearResendApiKey,
      resendFromEmail,
    });

    return {
      success: true,
      aiProvider: config.aiProvider,
      aiModel: config.aiModel,
      openrouterConfigured: !!config.openrouterApiKey,
      groqConfigured: !!config.groqApiKey,
      resendConfigured: !!config.resendApiKey,
      resendFromEmail: config.resendFromEmail ?? "",
    };
  } catch (error) {
    if (error instanceof AppConfigMigrationRequiredError) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "Failed to update service settings" };
  }
}

export async function testAiProviderConnection(): Promise<
  | { success: true; provider: "openrouter" | "groq"; model: string; message: string }
  | { success: false; error: string }
> {
  try {
    await requireAdminSession();
    const config = await getAppConfig();

    const provider = config.aiProvider;
    const model = config.aiModel;
    const apiKey =
      provider === "groq" ? config.groqApiKey : config.openrouterApiKey;

    if (!apiKey) {
      return {
        success: false,
        error:
          provider === "groq"
            ? "Groq API key is missing for the active provider."
            : "OpenRouter API key is missing for the active provider.",
      };
    }

    const llm =
      provider === "groq"
        ? createGroq({ apiKey })(model)
        : createOpenRouter({ apiKey }).chat(model);

    await generateText({
      model: llm,
      prompt: "Reply with exactly: ok",
      maxOutputTokens: 8,
      temperature: 0,
    });

    return {
      success: true,
      provider,
      model,
      message: `Connected to ${provider === "groq" ? "Groq" : "OpenRouter"} (${model}).`,
    };
  } catch {
    return {
      success: false,
      error:
        "Connection test failed. Verify provider, model, and API key, then try again.",
    };
  }
}

export async function testSmtpConnection(input?: {
  resendApiKey?: string;
  resendFromEmail?: string;
}): Promise<
  | { success: true; message: string }
  | { success: false; error: string }
> {
  try {
    await requireAdminSession();
    const config = await getAppConfig();

    const resendApiKey = input?.resendApiKey?.trim() || config.resendApiKey;
    const resendFromEmail =
      input?.resendFromEmail?.trim() || config.resendFromEmail;

    if (!resendApiKey) {
      return { success: false, error: "Resend API key is missing." };
    }

    if (
      resendFromEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resendFromEmail)
    ) {
      return { success: false, error: "From email is invalid." };
    }

    const response = await fetch("https://api.resend.com/domains", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        success: false,
        error:
          response.status === 401
            ? "Resend rejected the API key."
            : `Resend API request failed (${response.status}).`,
      };
    }

    return {
      success: true,
      message: "SMTP connection successful.",
    };
  } catch {
    return {
      success: false,
      error: "SMTP test failed. Check your key and network, then try again.",
    };
  }
}
