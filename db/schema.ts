import { pgTable, text, boolean, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

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
});

export const appConfig = pgTable("AppConfig", {
  id: integer("id").primaryKey(),
  publicSignupEnabled: boolean("publicSignupEnabled").notNull().default(true),
  openrouterApiKey: text("openrouterApiKey"),
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

export const bookmarks = pgTable("Bookmark", {
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
});

// Relations (used by the relational query API)
export const usersRelations = relations(users, ({ many }) => ({
  groups: many(groups),
  bookmarks: many(bookmarks),
  apiTokens: many(apiTokens),
  passwordResetTokens: many(passwordResetTokens),
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
