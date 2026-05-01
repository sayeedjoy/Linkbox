import { google } from "googleapis";

export type PlayVerifyResult =
  | {
      ok: true;
      subscriptionState: string | undefined;
      productIds: string[];
      transactionId: string | null;
      purchaseDate: Date | null;
      expiryDate: Date | null;
      autoRenewing: boolean;
      raw: unknown;
    }
  | { ok: false; reason: "env" | "credentials" | "api" };

type PlaySubscriptionV2 = {
  subscriptionState?: string;
  latestOrderId?: string;
  startTime?: string;
  lineItems?: Array<{
    productId?: string;
    expiryTime?: string;
    latestSuccessfulOrderId?: string;
    autoRenewingPlan?: {
      autoRenewEnabled?: boolean;
    };
  }>;
};

function parseDate(value: string | undefined): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export async function verifyPlaySubscription(
  purchaseToken: string,
  productIdToMatch?: string
): Promise<PlayVerifyResult> {
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
    const lineItems = Array.isArray(data.lineItems) ? data.lineItems : [];
    const productIds = lineItems
      .map((item) => (typeof item?.productId === "string" ? item.productId.trim() : ""))
      .filter(Boolean);
    const matchedLineItem =
      (productIdToMatch
        ? lineItems.find((item) => item?.productId?.trim() === productIdToMatch.trim())
        : undefined) ?? lineItems[0];
    const transactionId =
      (typeof matchedLineItem?.latestSuccessfulOrderId === "string" &&
      matchedLineItem.latestSuccessfulOrderId.trim()
        ? matchedLineItem.latestSuccessfulOrderId.trim()
        : null) ??
      (typeof data.latestOrderId === "string" && data.latestOrderId.trim()
        ? data.latestOrderId.trim()
        : null);
    return {
      ok: true,
      subscriptionState: data.subscriptionState,
      productIds,
      transactionId,
      purchaseDate: parseDate(data.startTime),
      expiryDate: parseDate(matchedLineItem?.expiryTime),
      autoRenewing: Boolean(matchedLineItem?.autoRenewingPlan?.autoRenewEnabled),
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
