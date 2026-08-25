import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
};

export const user = pgTable("user", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("CUSTOMER"),
  ...timestamps,
});

export const session = pgTable(
  "session",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [index("session_user_idx").on(table.userId)],
);

export const account = pgTable("account", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  ...timestamps,
});

export const verification = pgTable("verification", {
  id: uuid("id").defaultRandom().primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  ...timestamps,
});

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("userId").references(() => user.id, { onDelete: "set null" }),
    companyName: text("companyName").notNull(),
    contactName: text("contactName").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    gstNumber: text("gstNumber"),
    status: text("status").notNull().default("ACTIVE"),
    ...timestamps,
  },
  (table) => [uniqueIndex("customers_user_idx").on(table.userId)],
);

export const addresses = pgTable("addresses", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customerId")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("BILLING"),
  line1: text("line1").notNull(),
  line2: text("line2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  postalCode: text("postalCode").notNull(),
  country: text("country").notNull().default("India"),
  isDefault: boolean("isDefault").notNull().default(false),
  ...timestamps,
});

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  sortOrder: integer("sortOrder").notNull().default(0),
  isActive: boolean("isActive").notNull().default(true),
  ...timestamps,
});

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  categoryId: uuid("categoryId").references(() => categories.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  productType: text("productType").notNull().default("CONFIGURABLE"),
  configuration: jsonb("configuration").$type<Record<string, unknown>>().notNull().default({}),
  isActive: boolean("isActive").notNull().default(true),
  ...timestamps,
});

export const productVariants = pgTable("product_variants", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("productId")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sku: text("sku").unique(),
  options: jsonb("options").$type<Record<string, unknown>>().notNull().default({}),
  basePrice: numeric("basePrice", { precision: 12, scale: 2 }).notNull().default("0"),
  isActive: boolean("isActive").notNull().default(true),
  ...timestamps,
});

export const pricingRules = pgTable("pricing_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("productId")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  variantId: uuid("variantId").references(() => productVariants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  ruleType: text("ruleType").notNull().default("QUANTITY"),
  conditions: jsonb("conditions").$type<Record<string, unknown>>().notNull().default({}),
  priceFormula: jsonb("priceFormula").$type<Record<string, unknown>>().notNull().default({}),
  isActive: boolean("isActive").notNull().default(true),
  ...timestamps,
});

export const quotes = pgTable("quotes", {
  id: uuid("id").defaultRandom().primaryKey(),
  quoteNumber: text("quoteNumber").notNull().unique(),
  customerId: uuid("customerId").references(() => customers.id, { onDelete: "set null" }),
  userId: uuid("userId").references(() => user.id, { onDelete: "set null" }),
  status: text("status").notNull().default("NEW"),
  contactName: text("contactName").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  companyName: text("companyName"),
  notes: text("notes"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  tax: numeric("tax", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  validUntil: timestamp("validUntil", { withTimezone: true }),
  ...timestamps,
});

export const quoteItems = pgTable("quote_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  quoteId: uuid("quoteId")
    .notNull()
    .references(() => quotes.id, { onDelete: "cascade" }),
  productId: uuid("productId").references(() => products.id, { onDelete: "set null" }),
  variantId: uuid("variantId").references(() => productVariants.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  configuration: jsonb("configuration").$type<Record<string, unknown>>().notNull().default({}),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unitPrice", { precision: 12, scale: 2 }).notNull().default("0"),
  totalPrice: numeric("totalPrice", { precision: 12, scale: 2 }).notNull().default("0"),
});

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderNumber: text("orderNumber").notNull().unique(),
  customerId: uuid("customerId").references(() => customers.id, { onDelete: "set null" }),
  quoteId: uuid("quoteId").unique().references(() => quotes.id, { onDelete: "set null" }),
  status: text("status").notNull().default("PENDING"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  tax: numeric("tax", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  ...timestamps,
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("orderId")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("productId").references(() => products.id, { onDelete: "set null" }),
  variantId: uuid("variantId").references(() => productVariants.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  configuration: jsonb("configuration").$type<Record<string, unknown>>().notNull().default({}),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unitPrice", { precision: 12, scale: 2 }).notNull().default("0"),
  totalPrice: numeric("totalPrice", { precision: 12, scale: 2 }).notNull().default("0"),
});

export const artworks = pgTable("artworks", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("orderId").references(() => orders.id, { onDelete: "set null" }),
  quoteId: uuid("quoteId").references(() => quotes.id, { onDelete: "set null" }),
  customerId: uuid("customerId").references(() => customers.id, { onDelete: "set null" }),
  fileName: text("fileName").notNull(),
  fileType: text("fileType").notNull(),
  mimeType: text("mimeType").notNull(),
  fileSize: integer("fileSize").notNull(),
  storageKey: text("storageKey"),
  storageUrl: text("storageUrl"),
  status: text("status").notNull().default("UPLOADED"),
  notes: text("notes"),
  ...timestamps,
});

export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customerId").references(() => customers.id, { onDelete: "set null" }),
  source: text("source").notNull().default("WEBSITE"),
  status: text("status").notNull().default("NEW"),
  companyName: text("companyName"),
  contactName: text("contactName").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message"),
  requirement: jsonb("requirement").$type<Record<string, unknown>>().notNull().default({}),
  ...timestamps,
});
