import {
  pgTable,
  text,
  boolean,
  integer,
  timestamp,
  index,
  uniqueIndex,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export const subscriptionPlans = pgTable("SubscriptionPlan", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  slug: text("slug").notNull().unique(),
  displayName: text("displayName").notNull(),
  googlePlayProductId: text("googlePlayProductId").unique(),
  aiGroupingAllowed: boolean("aiGroupingAllowed").notNull().default(true),
  groupColoringAllowed: boolean("groupColoringAllowed").notNull().default(true),
  apiQuotaPerDay: integer("apiQuotaPerDay"),
  sortOrder: integer("sortOrder").notNull().default(0),
});

export const users = pgTable("User", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { precision: 3 }),
  name: text("name"),
  image: text("image"),
  password: text("password").notNull(),
  autoGroupEnabled: boolean("autoGroupEnabled").notNull().default(false),
  createdAt: timestamp("createdAt", { precision: 3 }).notNull().defaultNow(),
  bannedUntil: timestamp("bannedUntil", { precision: 3 }),
  subscriptionPlanId: text("subscriptionPlanId")
    .notNull()
    .references(() => subscriptionPlans.id, { onDelete: "restrict" }),
  planSource: text("planSource").notNull().default("default"),
});

export const userPlaySubscriptions = pgTable("UserPlaySubscription", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  productId: text("productId").notNull(),
  purchaseToken: text("purchaseToken").notNull().unique(),
  transactionId: text("transactionId"),
  purchaseDate: timestamp("purchaseDate", { precision: 3 }),
  expiryTime: timestamp("expiryTime", { precision: 3 }),
  autoRenewing: boolean("autoRenewing").notNull().default(false),
  lastVerifiedAt: timestamp("lastVerifiedAt", { precision: 3 }),
  rawPayload: text("rawPayload"),
});

export const userPlayPurchaseEvents = pgTable(
  "UserPlayPurchaseEvent",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    transactionId: text("transactionId"),
    purchaseToken: text("purchaseToken").notNull(),
    productId: text("productId").notNull(),
    purchaseDate: timestamp("purchaseDate", { precision: 3 }).notNull(),
    expiryDate: timestamp("expiryDate", { precision: 3 }),
    rawReceipt: text("rawReceipt").notNull(),
    verificationSource: text("verificationSource").notNull().default("play_api"),
    createdAt: timestamp("createdAt", { precision: 3 }).notNull().defaultNow(),
  },
  (t) => [
    index("UserPlayPurchaseEvent_userId_productId_idx").on(t.userId, t.productId),
    index("UserPlayPurchaseEvent_purchaseToken_idx").on(t.purchaseToken),
    index("UserPlayPurchaseEvent_transactionId_idx").on(t.transactionId),
  ]
);

export const apiUsageDaily = pgTable(
  "ApiUsageDaily",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    requestCount: integer("requestCount").notNull().default(0),
  },
  (t) => [uniqueIndex("ApiUsageDaily_userId_day_key").on(t.userId, t.day)]
);

export const appConfig = pgTable("AppConfig", {
  id: integer("id").primaryKey(),
  publicSignupEnabled: boolean("publicSignupEnabled").notNull().default(true),
  aiProvider: text("aiProvider").notNull().default("openrouter"),
  aiModel: text("aiModel").notNull().default("google/gemini-2.0-flash-001"),
  openrouterApiKey: text("openrouterApiKey"),
  groqApiKey: text("groqApiKey"),
  resendApiKey: text("resendApiKey"),
  resendFromEmail: text("resendFromEmail"),
});

export const adsConfig = pgTable("AdsConfig", {
  id: integer("id").primaryKey(),
  adsEnabled: boolean("adsEnabled").notNull().default(false),
  androidAppId: text("androidAppId"),
  androidBannerId: text("androidBannerId"),
  androidInterstitialId: text("androidInterstitialId"),
  androidAppOpenId: text("androidAppOpenId"),
  androidRewardedId: text("androidRewardedId"),
});

export const passwordResetTokens = pgTable("PasswordResetToken", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("tokenHash").notNull().unique(),
  expiresAt: timestamp("expiresAt", { precision: 3 }).notNull(),
  createdAt: timestamp("createdAt", { precision: 3 }).notNull().defaultNow(),
});

export const apiTokens = pgTable("ApiToken", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  tokenHash: text("tokenHash").notNull().unique(),
  tokenPrefix: text("tokenPrefix"),
  tokenSuffix: text("tokenSuffix"),
  lastUsedAt: timestamp("lastUsedAt", { precision: 3 }),
  createdAt: timestamp("createdAt", { precision: 3 }).notNull().defaultNow(),
});

export const groups = pgTable(
  "Group",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color"),
    order: integer("order").notNull().default(0),
  },
  (t) => [uniqueIndex("Group_userId_name_key").on(t.userId, t.name)]
);

export const bookmarks = pgTable(
  "Bookmark",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    groupId: text("groupId").references(() => groups.id, { onDelete: "set null" }),
    url: text("url"),
    title: text("title"),
    description: text("description"),
    faviconUrl: text("faviconUrl"),
    previewImageUrl: text("previewImageUrl"),
    createdAt: timestamp("createdAt", { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { precision: 3 }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    index("Bookmark_userId_idx").on(t.userId),
    index("Bookmark_createdAt_idx").on(t.createdAt),
  ]
);

export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  subscriptionPlan: one(subscriptionPlans, {
    fields: [users.subscriptionPlanId],
    references: [subscriptionPlans.id],
  }),
  playSubscriptions: many(userPlaySubscriptions),
  playPurchaseEvents: many(userPlayPurchaseEvents),
  groups: many(groups),
  bookmarks: many(bookmarks),
  apiTokens: many(apiTokens),
  passwordResetTokens: many(passwordResetTokens),
}));

export const userPlaySubscriptionsRelations = relations(userPlaySubscriptions, ({ one }) => ({
  user: one(users, { fields: [userPlaySubscriptions.userId], references: [users.id] }),
}));

export const userPlayPurchaseEventsRelations = relations(userPlayPurchaseEvents, ({ one }) => ({
  user: one(users, { fields: [userPlayPurchaseEvents.userId], references: [users.id] }),
}));

export const apiUsageDailyRelations = relations(apiUsageDaily, ({ one }) => ({
  user: one(users, { fields: [apiUsageDaily.userId], references: [users.id] }),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  user: one(users, { fields: [groups.userId], references: [users.id] }),
  bookmarks: many(bookmarks),
}));

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(users, { fields: [bookmarks.userId], references: [users.id] }),
  group: one(groups, { fields: [bookmarks.groupId], references: [groups.id] }),
}));

export const apiTokensRelations = relations(apiTokens, ({ one }) => ({
  user: one(users, { fields: [apiTokens.userId], references: [users.id] }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, { fields: [passwordResetTokens.userId], references: [users.id] }),
}));
