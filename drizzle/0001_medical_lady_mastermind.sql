CREATE TABLE "AdsConfig" (
	"id" integer PRIMARY KEY NOT NULL,
	"adsEnabled" boolean DEFAULT false NOT NULL,
	"androidAppId" text,
	"androidBannerId" text,
	"androidInterstitialId" text,
	"androidAppOpenId" text,
	"androidRewardedId" text
);
