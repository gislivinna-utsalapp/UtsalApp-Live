import { z } from "zod";

/*
 * USER
 */
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  passwordHash: z.string(),
  role: z.enum(["user", "store", "admin"]),
  storeId: z.string().nullable().optional(),
});

export type User = z.infer<typeof userSchema>;

/*
 * STORE
 */
export const storeSchema = z.object({
  id: z.string(),
  name: z.string(),

  // MIKILVÆGT: address (staðsetning verslunar)
  address: z.string().nullable().optional(),

  // Aukareitir sem þú ert nú þegar að nota í routes/storage
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),

  // NÝTT: flokkar verslunar – top-level, allt að 3 í UI (en schema leyfir fleiri)
  categories: z.array(z.string()).optional(),

  ownerEmail: z.string().email(),

  plan: z.string().optional(), // "basic" | "pro" | "premium" o.s.frv.
  trialEndsAt: z.string().nullable().optional(),
  billingStatus: z.string().nullable().optional(),

  // Admin / kerfisreitir
  isBanned: z.boolean().optional(),
  createdAt: z.string().nullable().optional(),
});

export type Store = z.infer<typeof storeSchema>;

/*
 * SALE POST (grunn-gögn í "database.json")
 */
export const salePostSchema = z.object({
  id: z.string(),
  title: z.string(),

  description: z.string().nullable().optional(),

  // Gamli reiturinn (fyrsti flokkurinn)
  category: z.string().nullable().optional(),

  // NÝTT: listi af flokkum (hámark 3 í UI, en schema leyfir fleiri)
  categories: z.array(z.string()).optional(),

  // Í DB ertu með price / oldPrice – geymum bæði sem valfrjálsar tölur
  price: z.number().nullable().optional(),
  oldPrice: z.number().nullable().optional(),

  // Sumir client hlutar vísa í priceOriginal / priceSale – höldum því líka hér
  priceOriginal: z.number().nullable().optional(),
  priceSale: z.number().nullable().optional(),

  imageUrl: z.string().nullable().optional(),
  storeId: z.string(),

  buyUrl: z.string().nullable().optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),

  createdAt: z.string().nullable().optional(),
  viewCount: z.number().optional(),
});

export type SalePost = z.infer<typeof salePostSchema>;

/*
 * IMAGE OBJECT fyrir frontend (images: [{ url, alt }])
 */
export const imageSchema = z.object({
  url: z.string(),
  alt: z.string().optional(),
});

/*
 * STORE SUMMARY sem fer inn í SalePostWithDetails.store
 * – þetta er það sem routes.ts er að búa til í mapPostToFrontend.
 */
export const storeSummarySchema = z.object({
  id: z.string(),
  name: z.string(),

  // LYKILATRIÐI: address fer með í auglýsingar
  address: z.string().nullable().optional(),

  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),

  plan: z.string().optional(),
  planType: z.string().optional(),
  billingStatus: z.string().nullable().optional(),

  createdAt: z.string().nullable().optional(),
  isBanned: z.boolean().optional(),
});

export type StoreSummary = z.infer<typeof storeSummarySchema>;

/*
 * SALE POST WITH DETAILS – það sem client notar (t.d. í PostDetail og SalePostCard)
 * routes.ts → mapPostToFrontend skilar þessu shape.
 */
export const salePostWithDetailsSchema = z.object({
  id: z.string(),
  title: z.string(),

  description: z.string().nullable().optional(),

  // Fyrsti flokkurinn (fyrir eldri kóða)
  category: z.string().nullable().optional(),

  // NÝTT: margir flokkar við eitt tilboð
  categories: z.array(z.string()).optional(),

  priceOriginal: z.number().nullable().optional(),
  priceSale: z.number().nullable().optional(),

  images: z.array(imageSchema).default([]),

  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),

  buyUrl: z.string().nullable().optional(),
  viewCount: z.number().optional().default(0),

  store: storeSummarySchema.nullable().optional(),
});

export type SalePostWithDetails = z.infer<typeof salePostWithDetailsSchema>;
