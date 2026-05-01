import { google } from "googleapis";

export type PlayVerifyResult =
  | {
      ok: true;
      subscriptionState: string | undefined;
      productIds: string[];
      raw: unknown;
    }
  | { ok: false; reason: "env" | "credentials" | "api" };

type PlaySubscriptionV2 = {
  subscriptionState?: string;
  lineItems?: Array<{ productId?: string }>;
};

export async function verifyPlaySubscription(purchaseToken: string): Promise<PlayVerifyResult> {
  const pkg = process.env.GOOGLE_PLAY_PACKAGE_NAME?.trim();
  const json = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON?.trim();
  if (!pkg || !json) return { ok: false, reason: "env" };

  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(json) as Record<string, unknown>;
  } catch {
    return { ok: false, reason: "credentials" };
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });

  const androidpublisher = google.androidpublisher({ version: "v3", auth });

  try {
    const res = await androidpublisher.purchases.subscriptionsv2.get({
      packageName: pkg,
      token: purchaseToken,
    });
    const data = res.data as PlaySubscriptionV2;
    const productIds = Array.isArray(data.lineItems)
      ? data.lineItems
          .map((item) => (typeof item?.productId === "string" ? item.productId.trim() : ""))
          .filter(Boolean)
      : [];
    return {
      ok: true,
      subscriptionState: data.subscriptionState,
      productIds,
      raw: res.data,
    };
  } catch {
    return { ok: false, reason: "api" };
  }
}

export function isPlaySubscriptionEntitled(subscriptionState: string | undefined): boolean {
  if (!subscriptionState) return false;
  return (
    subscriptionState === "SUBSCRIPTION_STATE_ACTIVE" ||
    subscriptionState === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"
  );
}
