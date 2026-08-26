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
  phoneNumber: text("phoneNumber").unique(),
  phoneNumberVerified: boolean("phoneNumberVerified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("CUSTOMER"),
  ...timestamps,
});

export const admins = pgTable(
  "admins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("ADMIN"),
    status: text("status").notNull().default("ACTIVE"),
    createdBy: uuid("createdBy").references(() => user.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [uniqueIndex("admins_user_idx").on(table.userId)],
);

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
  issuer: text("issuer").notNull(),
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
  shortDescription: text("shortDescription"),
  productCode: text("productCode"),
  productReference: text("productReference"),
  productClass: text("productClass"),
  productType: text("productType").notNull().default("CONFIGURABLE"),
  configuration: jsonb("configuration").$type<Record<string, unknown>>().notNull().default({}),
  imageUrl: text("imageUrl"),
  status: text("status").notNull().default("ACTIVE"),
  orderable: boolean("orderable").notNull().default(false),
  quoteable: boolean("quoteable").notNull().default(true),
  isActive: boolean("isActive").notNull().default(true),
  productionTime: text("productionTime"),
  artworkRequired: boolean("artworkRequired").notNull().default(false),
  artworkInstructions: text("artworkInstructions"),
  sortOrder: integer("sortOrder").notNull().default(0),
  referenceQuantity: integer("referenceQuantity"),
  referenceWeight: numeric("referenceWeight", { precision: 12, scale: 3 }),
  referenceWeightUnit: text("referenceWeightUnit"),
  pricesTaxInclusive: boolean("pricesTaxInclusive").notNull().default(true),
  archivedAt: timestamp("archivedAt", { withTimezone: true }),
  ...timestamps,
});

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
    imageUrl: text("imageUrl").notNull(),
    storageKey: text("storageKey"),
    altText: text("altText"),
    sortOrder: integer("sortOrder").notNull().default(0),
    isPrimary: boolean("isPrimary").notNull().default(false),
    ...timestamps,
  },
  (table) => [index("product_images_product_idx").on(table.productId)],
);

export const productContentSections = pgTable(
  "product_content_sections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    sortOrder: integer("sortOrder").notNull().default(0),
    ...timestamps,
  },
  (table) => [index("product_content_sections_product_idx").on(table.productId)],
);

export const productContentItems = pgTable(
  "product_content_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sectionId: uuid("sectionId").notNull().references(() => productContentSections.id, { onDelete: "cascade" }),
    label: text("label"),
    content: text("content").notNull(),
    sortOrder: integer("sortOrder").notNull().default(0),
    ...timestamps,
  },
  (table) => [index("product_content_items_section_idx").on(table.sectionId)],
);

export const addons = pgTable("addons", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  pricingType: text("pricingType").notNull().default("FIXED"),
  priceConfiguration: jsonb("priceConfiguration").$type<Record<string, unknown>>().notNull().default({}),
  isActive: boolean("isActive").notNull().default(true),
  ...timestamps,
});

export const productAddons = pgTable(
  "product_addons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
    addonId: uuid("addonId").notNull().references(() => addons.id, { onDelete: "cascade" }),
    price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
    isActive: boolean("isActive").notNull().default(true),
    isDefault: boolean("isDefault").notNull().default(false),
    sortOrder: integer("sortOrder").notNull().default(0),
    taxInclusive: boolean("taxInclusive").notNull().default(true),
    ...timestamps,
  },
  (table) => [uniqueIndex("product_addons_product_addon_idx").on(table.productId, table.addonId), index("product_addons_product_idx").on(table.productId)],
);

export const productDeliveryRules = pgTable(
  "product_delivery_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
    deliveryMethod: text("deliveryMethod").notNull(),
    stateCode: text("stateCode").notNull().default("*"),
    price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
    isActive: boolean("isActive").notNull().default(true),
    sortOrder: integer("sortOrder").notNull().default(0),
    taxInclusive: boolean("taxInclusive").notNull().default(true),
    ...timestamps,
  },
  (table) => [uniqueIndex("product_delivery_rules_product_method_state_idx").on(table.productId, table.deliveryMethod, table.stateCode), index("product_delivery_rules_product_idx").on(table.productId)],
);

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

export const carts = pgTable(
  "carts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("PURCHASE"),
    ...timestamps,
  },
  (table) => [uniqueIndex("carts_user_kind_idx").on(table.userId, table.kind)],
);

export const cartItems = pgTable("cart_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  cartId: uuid("cartId").notNull().references(() => carts.id, { onDelete: "cascade" }),
  productId: uuid("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  configuration: jsonb("configuration").$type<Record<string, unknown>>().notNull().default({}),
  quantity: integer("quantity").notNull().default(1),
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
  taxInclusive: boolean("taxInclusive").notNull().default(true),
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
  pricingSnapshot: jsonb("pricingSnapshot").$type<Record<string, unknown>>().notNull().default({}),
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
  pricingSnapshot: jsonb("pricingSnapshot").$type<Record<string, unknown>>().notNull().default({}),
});

export const artworks = pgTable("artworks", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("orderId").references(() => orders.id, { onDelete: "set null" }),
  quoteId: uuid("quoteId").references(() => quotes.id, { onDelete: "set null" }),
  customerId: uuid("customerId").references(() => customers.id, { onDelete: "set null" }),
  fileName: text("fileName").notNull(),
  fileType: text("fileType").notNull(),
  extension: text("extension").notNull().default(".cdr"),
  mimeType: text("mimeType").notNull(),
  fileSize: integer("fileSize").notNull(),
  uploadedBy: uuid("uploadedBy").references(() => user.id, { onDelete: "set null" }),
  storageKey: text("storageKey"),
  storageUrl: text("storageUrl"),
  status: text("status").notNull().default("PENDING_REVIEW"),
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

export const inquiries = pgTable("inquiries", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customerId").references(() => customers.id, { onDelete: "set null" }),
  source: text("source").notNull().default("WEBSITE"),
  status: text("status").notNull().default("NEW"),
  companyName: text("companyName"),
  contactName: text("contactName").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject"),
  message: text("message").notNull(),
  requirement: jsonb("requirement").$type<Record<string, unknown>>().notNull().default({}),
  ...timestamps,
});

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("orderId").notNull().unique().references(() => orders.id, { onDelete: "cascade" }),
  customerId: uuid("customerId").references(() => customers.id, { onDelete: "set null" }),
  method: text("method").notNull().default("COD"),
  status: text("status").notNull().default("PENDING"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  provider: text("provider"),
  providerOrderId: text("providerOrderId"),
  providerPaymentId: text("providerPaymentId"),
  codCollectedAt: timestamp("codCollectedAt", { withTimezone: true }),
  ...timestamps,
});

export const paymentTransactions = pgTable("payment_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  paymentId: uuid("paymentId").notNull().references(() => payments.id, { onDelete: "cascade" }),
  transactionId: text("transactionId"),
  status: text("status").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  rawData: jsonb("rawData").$type<Record<string, unknown>>().notNull().default({}),
  ...timestamps,
});
