"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateAdsConfig } from "@/app/actions/ads-config";
import type { AdsConfig } from "@/lib/ads-config";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

type Props = {
  initialConfig: AdsConfig;
};

type Fields = {
  androidAppId: string;
  androidBannerId: string;
  androidInterstitialId: string;
  androidAppOpenId: string;
  androidRewardedId: string;
};

const FIELD_LABELS: { key: keyof Fields; label: string; placeholder: string }[] = [
  { key: "androidAppId", label: "App ID", placeholder: "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX" },
  { key: "androidBannerId", label: "Banner ID", placeholder: "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX" },
  { key: "androidInterstitialId", label: "Interstitial ID", placeholder: "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX" },
  { key: "androidAppOpenId", label: "App Open ID", placeholder: "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX" },
  { key: "androidRewardedId", label: "Rewarded ID", placeholder: "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX" },
];

export function AdsConfigCard({ initialConfig }: Props) {
  const [adsEnabled, setAdsEnabled] = useState(initialConfig.adsEnabled);
  const [fields, setFields] = useState<Fields>({
    androidAppId: initialConfig.androidAppId ?? "",
    androidBannerId: initialConfig.androidBannerId ?? "",
    androidInterstitialId: initialConfig.androidInterstitialId ?? "",
    androidAppOpenId: initialConfig.androidAppOpenId ?? "",
    androidRewardedId: initialConfig.androidRewardedId ?? "",
  });
  const [isPending, startTransition] = useTransition();

  function handleFieldChange(key: keyof Fields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function handleToggle(checked: boolean) {
    const previous = adsEnabled;
    setAdsEnabled(checked);
    startTransition(async () => {
      const result = await updateAdsConfig({
        adsEnabled: checked,
        androidAppId: fields.androidAppId || null,
        androidBannerId: fields.androidBannerId || null,
        androidInterstitialId: fields.androidInterstitialId || null,
        androidAppOpenId: fields.androidAppOpenId || null,
        androidRewardedId: fields.androidRewardedId || null,
      });
      if (!result.success) {
        setAdsEnabled(previous);
        toast.error(result.error);
      } else {
        toast.success(checked ? "Ads enabled" : "Ads disabled");
      }
    });
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateAdsConfig({
        adsEnabled,
        androidAppId: fields.androidAppId || null,
        androidBannerId: fields.androidBannerId || null,
        androidInterstitialId: fields.androidInterstitialId || null,
        androidAppOpenId: fields.androidAppOpenId || null,
        androidRewardedId: fields.androidRewardedId || null,
      });
      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success("Ads configuration saved");
      }
    });
  }

  return (
    <Card size="sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Google AdMob</CardTitle>
        <CardDescription>
          Configure ad unit IDs for Android. Changes are served immediately via the mobile ads API.
        </CardDescription>
      </CardHeader>

      {/* Enable/disable toggle */}
      <CardContent className="flex items-center justify-between gap-4 border-t border-border pt-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-foreground">
            {adsEnabled ? "Ads enabled" : "Ads disabled"}
          </p>
          <p className="text-xs text-muted-foreground">
            {adsEnabled
              ? "Ads are active in the mobile app."
              : "All ads are suppressed regardless of IDs."}
          </p>
        </div>
        <Switch
          checked={adsEnabled}
          disabled={isPending}
          onCheckedChange={handleToggle}
          aria-label="Toggle ads"
        />
      </CardContent>

      {/* Android ad unit fields */}
      <CardContent className="space-y-3 border-t border-border pt-3">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Android
        </p>
        {FIELD_LABELS.map(({ key, label, placeholder }) => (
          <div key={key} className="space-y-1">
            <label className="text-xs font-medium text-foreground" htmlFor={key}>
              {label}
            </label>
            <Input
              id={key}
              value={fields[key]}
              onChange={(e) => handleFieldChange(key, e.target.value)}
              placeholder={placeholder}
              disabled={isPending}
              className="font-mono text-xs"
            />
          </div>
        ))}

        <Button
          size="sm"
          className="mt-1 w-full"
          onClick={handleSave}
          disabled={isPending}
        >
          {isPending ? "Saving…" : "Save ad unit IDs"}
        </Button>
      </CardContent>
    </Card>
  );
}
