import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  real,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().$type<"store" | "admin">(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const stores = pgTable("stores", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  logoUrl: text("logo_url"),
  address: text("address"),
  geoLat: real("geo_lat"),
  geoLng: real("geo_lng"),
  phone: text("phone"),
  website: text("website"),
  ownerUserId: varchar("owner_user_id")
    .notNull()
    .references(() => users.id),

  // ---- Trial / Billing reitir ----
  plan: text("plan")
    .notNull()
    .default("basic")
    .$type<"basic" | "pro" | "premium">(),

  // Hvenær fríviku lýkur (sett af backend þegar pakki er valinn)
  trialEndsAt: timestamp("trial_ends_at"),

  // Staða áskriftar / prufu
  billingStatus: text("billing_status")
    .notNull()
    .default("trial")
    .$type<"trial" | "active" | "expired">(),
  // -------------------------------

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const salePosts = pgTable("sale_posts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  storeId: varchar("store_id")
    .notNull()
    .references(() => stores.id),
  title: text("title").notNull(),
  description: text("description"),
  priceOriginal: real("price_original").notNull(),
  priceSale: real("price_sale").notNull(),
  category: text("category")
    .notNull()
    .$type<"fatnad" | "husgogn" | "raftaeki" | "matvorur" | "annad">(),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const images = pgTable("images", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  salePostId: varchar("sale_post_id")
    .notNull()
    .references(() => salePosts.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  alt: text("alt"),
});

export const viewEvents = pgTable("view_events", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  salePostId: varchar("sale_post_id")
    .notNull()
    .references(() => salePosts.id),
  viewedAt: timestamp("viewed_at").notNull().defaultNow(),
  ipHash: text("ip_hash"),
});

export const favorites = pgTable("favorites", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  salePostId: varchar("sale_post_id")
    .notNull()
    .references(() => salePosts.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users)
  .omit({
    id: true,
    createdAt: true,
    passwordHash: true,
  })
  .extend({
    password: z
      .string()
      .min(6, "Lykilorð verður að vera að minnsta kosti 6 stafir"),
  });

export const insertStoreSchema = createInsertSchema(stores).omit({
  id: true,
  createdAt: true,
  ownerUserId: true,
  // Plan / billing reitir eru stýrðir af backend þegar pakki er valinn
  plan: true,
  trialEndsAt: true,
  billingStatus: true,
});

export const insertSalePostSchema = createInsertSchema(salePosts)
  .omit({
    id: true,
    createdAt: true,
    isActive: true,
  })
  .extend({
    images: z
      .array(
        z.object({
          url: z.string(),
          alt: z.string().optional(),
        }),
      )
      .min(1, "Þarf að minnsta kosti eina mynd"),
  });

export const insertImageSchema = createInsertSchema(images).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Store = typeof stores.$inferSelect;

export type InsertSalePost = z.infer<typeof insertSalePostSchema>;
export type SalePost = typeof salePosts.$inferSelect;

export type Image = typeof images.$inferSelect;
export type ViewEvent = typeof viewEvents.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;

export type SalePostWithDetails = SalePost & {
  store: Store;
  images: Image[];
  viewCount?: number;
  discountPercent: number;
};
