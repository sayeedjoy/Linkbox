import { CrownIcon } from "lucide-react";
import { EndpointCard } from "@/components/admin/api-docs/endpoint-card";

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function PlanApiDocsSection() {
  return (
    <section className="space-y-3">
      <SectionHeader
        icon={CrownIcon}
        title="Plans & user settings"
        description="Subscription entitlements, AI/group preferences, and Google Play verification"
      />

      <EndpointCard
        method="GET"
        path="/api/settings"
        auth="bearer"
        description="Returns the signed-in user's auto-group preference and effective plan entitlements. Accepts Bearer Authorization (extension/mobile) or a web session cookie when called from the browser."
        responseBody={`{
  "autoGroupEnabled": false,
  "aiGroupingAllowed": true,
  "groupColoringAllowed": true,
  "apiQuotaPerDay": null,
  "planSource": "default",
  "plan": { "slug": "free", "displayName": "Free" }
}`}
        notes={[
          "planSource is default | play | admin.",
          "apiQuotaPerDay is null when unlimited.",
          "CORS allows chrome-extension:// origins.",
        ]}
      />

      <EndpointCard
        method="PATCH"
        path="/api/settings"
        auth="bearer"
        description="Update auto-group preference. Same auth modes as GET."
        requestBody={`{ "autoGroupEnabled": true }`}
        responseBody={`200 OK — same shape as GET /api/settings`}
        notes={[
          "Returns 403 if autoGroupEnabled is set to true but the user's plan does not allow AI grouping.",
          "When enabling auto-group, the server may start a background backfill of ungrouped bookmarks.",
        ]}
      />

      <EndpointCard
        method="GET"
        path="/api/mobile/plans"
        auth="bearer"
        description="Returns the plan catalog for the app plan page."
        responseBody={`{
  "plans": [
    {
      "id": "plan_id",
      "slug": "premium",
      "displayName": "Pro",
      "googlePlayProductId": "your_subscription_product_id",
      "aiGroupingAllowed": true,
      "groupColoringAllowed": true,
      "apiQuotaPerDay": null,
      "sortOrder": 1
    }
  ]
}`}
        notes={[
          "Authenticated endpoint.",
          "Result is ordered by sortOrder.",
          "Use this endpoint to render plan options in mobile or web app plan pages.",
        ]}
      />

      <EndpointCard
        method="POST"
        path="/api/mobile/billing/google-play"
        auth="bearer"
        description="Verify a Google Play subscription purchase token and sync entitlements. Maps productId to the plan whose googlePlayProductId matches (configured in Admin → Plans). Does not downgrade or upgrade users locked with planSource admin."
        requestBody={`{
  "purchaseToken": "purchase-token-from-Google-Play-Billing",
  "productId": "your_subscription_product_id"
}`}
        responseBody={`200 OK

{
  "entitled": true,
  "subscriptionState": "SUBSCRIPTION_STATE_ACTIVE",
  "entitlements": {
    "autoGroupEnabled": false,
    "aiGroupingAllowed": true,
    "groupColoringAllowed": true,
    "apiQuotaPerDay": null,
    "planSource": "play",
    "plan": { "slug": "premium", "displayName": "Pro" }
  }
}`}
        notes={[
          "Requires server env: GOOGLE_PLAY_PACKAGE_NAME and GOOGLE_PLAY_SERVICE_ACCOUNT_JSON (service account JSON string).",
          "503 if Play env is not configured; 502 if Google's API rejects the token.",
          "400 if productId does not match any plan's Google Play product ID.",
          "Always appends a UserPlayPurchaseEvent row and upserts UserPlaySubscription by purchaseToken.",
        ]}
      />
    </section>
  );
}
