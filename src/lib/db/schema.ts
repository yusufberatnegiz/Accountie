import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const appRole = pgEnum("app_role", ["admin", "member"]);
export const reviewStatus = pgEnum("review_status", ["pending", "approved", "rejected"]);
export const syncStatus = pgEnum("sync_status", ["running", "succeeded", "failed"]);
export const noteVisibility = pgEnum("note_visibility", ["private", "office"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  fullName: text("full_name").notNull().default(""),
  role: appRole("role").notNull().default("member"),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  kind: text("kind").notNull(),
  baseUrl: text("base_url").notNull().unique(),
  enabled: boolean("enabled").notNull().default(true),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
  lastError: text("last_error"),
  ...timestamps,
});

export const syncRuns = pgTable("sync_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: uuid("source_id").notNull().references(() => sources.id, { onDelete: "restrict" }),
  trigger: text("trigger").notNull().default("cron"),
  status: syncStatus("status").notNull().default("running"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  foundCount: integer("found_count").notNull().default(0),
  changedCount: integer("changed_count").notNull().default(0),
  errorMessage: text("error_message"),
}, (table) => [index("sync_runs_source_idx").on(table.sourceId, table.startedAt)]);

export const sourceItems = pgTable("source_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: uuid("source_id").notNull().references(() => sources.id, { onDelete: "restrict" }),
  externalKey: text("external_key").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull().default(""),
  sourceUrl: text("source_url").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  contentHash: text("content_hash").notNull(),
  rawPayload: jsonb("raw_payload").notNull().default({}),
  reviewStatus: reviewStatus("review_status").notNull().default("pending"),
  reviewedBy: uuid("reviewed_by").references(() => profiles.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("source_items_source_external_unique").on(table.sourceId, table.externalKey),
  index("source_items_review_idx").on(table.reviewStatus, table.firstSeenAt),
]);

export const calendarEvents = pgTable("calendar_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceItemId: uuid("source_item_id").references(() => sourceItems.id, { onDelete: "set null" }),
  sourceId: uuid("source_id").notNull().references(() => sources.id, { onDelete: "restrict" }),
  externalKey: text("external_key").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  taxType: text("tax_type").notNull(),
  actionType: text("action_type").notNull(),
  periodDescription: text("period_description").notNull().default(""),
  startsOn: date("starts_on"),
  dueOn: date("due_on").notNull(),
  priority: smallint("priority").notNull().default(2),
  sourceUrl: text("source_url").notNull(),
  reviewStatus: reviewStatus("review_status").notNull().default("pending"),
  reviewedBy: uuid("reviewed_by").references(() => profiles.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  unique("calendar_events_source_external_unique").on(table.sourceId, table.externalKey),
  index("calendar_events_due_on_idx").on(table.dueOn, table.reviewStatus),
]);

export const updates = pgTable("updates", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceItemId: uuid("source_item_id").notNull().unique().references(() => sourceItems.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  summary: text("summary").notNull().default(""),
  sourceUrl: text("source_url").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  reviewStatus: reviewStatus("review_status").notNull().default("pending"),
  reviewedBy: uuid("reviewed_by").references(() => profiles.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("updates_published_idx").on(table.publishedAt, table.reviewStatus)]);

export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  noteDate: date("note_date").notNull().default(sql`current_date`),
  reminderAt: timestamp("reminder_at", { withTimezone: true }),
  relatedType: text("related_type"),
  relatedId: uuid("related_id"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  visibility: noteVisibility("visibility").notNull().default("private"),
  ...timestamps,
}, (table) => [
  index("notes_owner_idx").on(table.ownerId, table.updatedAt),
  index("notes_reminder_idx").on(table.ownerId, table.reminderAt),
]);

export const favorites = pgTable("favorites", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull(),
  itemId: uuid("item_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("favorites_user_item_unique").on(table.userId, table.itemType, table.itemId)]);

export const readItems = pgTable("read_items", {
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  updateId: uuid("update_id").notNull().references(() => updates.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.userId, table.updateId] })]);

export const auditLogs = pgTable("audit_logs", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  actorId: uuid("actor_id").references(() => profiles.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  details: jsonb("details").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
