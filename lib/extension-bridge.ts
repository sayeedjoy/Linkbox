"use client";

type ChromeRuntimeApi = {
  sendMessage: (
    extensionId: string,
    message: unknown,
    callback: (response: unknown) => void
  ) => void;
  lastError?: { message: string };
};

function getChromeRuntime(): ChromeRuntimeApi | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { chrome?: { runtime?: ChromeRuntimeApi } };
  return w.chrome?.runtime ?? null;
}

function getExtensionId(): string | null {
  const id = process.env.NEXT_PUBLIC_LINKARENA_EXTENSION_ID?.trim();
  return id && id.length > 0 ? id : null;
}

export function isExtensionConfigured(): boolean {
  return getExtensionId() !== null;
}

export async function sendToExtension<T = unknown>(
  message: unknown,
  timeoutMs = 5000
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const runtime = getChromeRuntime();
  const extensionId = getExtensionId();
  if (!runtime || !extensionId) {
    return { ok: false, error: "not_installed" };
  }
  return new Promise((resolve) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ ok: false, error: "timeout" });
    }, timeoutMs);
    try {
      runtime.sendMessage(extensionId, message, (response: unknown) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        const lastError = runtime.lastError?.message;
        if (lastError) {
          resolve({ ok: false, error: lastError });
          return;
        }
        resolve({ ok: true, data: response as T });
      });
    } catch (err) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve({ ok: false, error: err instanceof Error ? err.message : "unknown" });
    }
  });
}

export async function isExtensionInstalled(): Promise<boolean> {
  const result = await sendToExtension<{ ok?: boolean }>({ type: "ping" }, 1500);
  return result.ok === true && (result.data?.ok === true);
}
