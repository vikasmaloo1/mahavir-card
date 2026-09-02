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
    customerType: text("customerType").notNull().default("B2C"),
    city: text("city"),
    state: text("state"),
    stateCode: text("stateCode"),
    creditEnabled: boolean("creditEnabled").notNull().default(false),
    creditLimit: numeric("creditLimit", { precision: 12, scale: 2 }).notNull().default("0"),
    availableCredit: numeric("availableCredit", { precision: 12, scale: 2 }).notNull().default("0"),
    walletBalance: numeric("walletBalance", { precision: 12, scale: 2 }).notNull().default("0"),
    paymentTermsDays: integer("paymentTermsDays").notNull().default(0),
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
  stateCode: text("stateCode"),
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
    originalFilename: text("originalFilename"),
    contentType: text("contentType"),
    fileSize: integer("fileSize"),
    altText: text("altText"),
    sortOrder: integer("sortOrder").notNull().default(0),
    isPrimary: boolean("isPrimary").notNull().default(false),
    ...timestamps,
  },
  (table) => [index("product_images_product_idx").on(table.productId)],
);

export const categoryImages = pgTable(
  "category_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoryId: uuid("categoryId").notNull().references(() => categories.id, { onDelete: "cascade" }),
    imageUrl: text("imageUrl").notNull(),
    storageKey: text("storageKey").notNull().unique(),
    originalFilename: text("originalFilename").notNull(),
    contentType: text("contentType").notNull(),
    fileSize: integer("fileSize").notNull(),
    altText: text("altText"),
    sortOrder: integer("sortOrder").notNull().default(0),
    isPrimary: boolean("isPrimary").notNull().default(false),
    ...timestamps,
  },
  (table) => [index("category_images_category_idx").on(table.categoryId)],
);

export const brandingAssets = pgTable(
  "branding_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetKey: text("assetKey").notNull().unique(),
    assetType: text("assetType").notNull().default("ASSET"),
    storageKey: text("storageKey").notNull().unique(),
    imageUrl: text("imageUrl").notNull(),
    originalFilename: text("originalFilename").notNull(),
    contentType: text("contentType").notNull(),
    fileSize: integer("fileSize").notNull(),
    altText: text("altText"),
    isPublic: boolean("isPublic").notNull().default(true),
    isActive: boolean("isActive").notNull().default(true),
    ...timestamps,
  },
  (table) => [index("branding_assets_type_idx").on(table.assetType)],
);

export const businessSettings = pgTable("business_settings", {
  id: text("id").primaryKey().default("primary"),
  businessName: text("businessName").notNull().default("Mahavir Card"),
  addressLine1: text("addressLine1"),
  addressLine2: text("addressLine2"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postalCode"),
  phone: text("phone"),
  email: text("email"),
  whatsapp: text("whatsapp"),
  businessHours: text("businessHours"),
  footerText: text("footerText"),
  logoAssetId: uuid("logoAssetId").references(() => brandingAssets.id, { onDelete: "set null" }),
  updatedBy: uuid("updatedBy").references(() => user.id, { onDelete: "set null" }),
  ...timestamps,
});

export const notices = pgTable(
  "notices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    tone: text("tone").notNull().default("INFO"),
    placement: text("placement").notNull().default("GLOBAL"),
    animationType: text("animationType").notNull().default("MARQUEE"),
    priority: text("priority").notNull().default("NORMAL"),
    linkLabel: text("linkLabel"),
    linkUrl: text("linkUrl"),
    startsAt: timestamp("startsAt", { withTimezone: true }),
    endsAt: timestamp("endsAt", { withTimezone: true }),
    sortOrder: integer("sortOrder").notNull().default(0),
    isActive: boolean("isActive").notNull().default(true),
    updatedBy: uuid("updatedBy").references(() => user.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [index("notices_active_placement_idx").on(table.isActive, table.placement, table.sortOrder)],
);

export const banners = pgTable(
  "banners",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    badge: text("badge"),
    ctaLabel: text("ctaLabel"),
    ctaUrl: text("ctaUrl"),
    imageUrl: text("imageUrl"),
    storageKey: text("storageKey"),
    mobileImageUrl: text("mobileImageUrl"),
    mobileStorageKey: text("mobileStorageKey"),
    composition: text("composition").notNull().default("SPLIT_RIGHT"),
    placement: text("placement").notNull().default("HOME_HERO_BOTTOM"),
    animationType: text("animationType").notNull().default("FADE"),
    sortOrder: integer("sortOrder").notNull().default(0),
    isActive: boolean("isActive").notNull().default(true),
    startsAt: timestamp("startsAt", { withTimezone: true }),
    endsAt: timestamp("endsAt", { withTimezone: true }),
    updatedBy: uuid("updatedBy").references(() => user.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [index("banners_active_placement_idx").on(table.isActive, table.placement, table.sortOrder)],
);

export const terms = pgTable(
  "terms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    titleGu: text("titleGu"),
    titleHi: text("titleHi"),
    content: text("content").notNull(),
    contentGu: text("contentGu"),
    contentHi: text("contentHi"),
    category: text("category").notNull().default("GENERAL"),
    isImportant: boolean("isImportant").notNull().default(false),
    sortOrder: integer("sortOrder").notNull().default(0),
    isActive: boolean("isActive").notNull().default(true),
    updatedBy: uuid("updatedBy").references(() => user.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [index("terms_active_sort_idx").on(table.isActive, table.sortOrder)],
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
    pricingRuleId: uuid("pricingRuleId").references(() => pricingRules.id, { onDelete: "cascade" }),
    addonId: uuid("addonId").notNull().references(() => addons.id, { onDelete: "cascade" }),
    price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
    isActive: boolean("isActive").notNull().default(true),
    isDefault: boolean("isDefault").notNull().default(false),
    sortOrder: integer("sortOrder").notNull().default(0),
    taxInclusive: boolean("taxInclusive").notNull().default(true),
    ...timestamps,
  },
  (table) => [uniqueIndex("product_addons_scope_addon_idx").on(table.productId, table.pricingRuleId, table.addonId), index("product_addons_product_idx").on(table.productId), index("product_addons_pricing_rule_idx").on(table.pricingRuleId)],
);

export const artworkRequirements = pgTable(
  "artwork_requirements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
    pricingRuleId: uuid("pricingRuleId").references(() => pricingRules.id, { onDelete: "cascade" }),
    scopeKey: text("scopeKey").notNull(),
    artworkRequired: boolean("artworkRequired").notNull().default(false),
    acceptedFormats: jsonb("acceptedFormats").$type<Array<"CDR">>().notNull().default(["CDR"]),
    minFileSize: integer("minFileSize"),
    maxFileSize: integer("maxFileSize"),
    maxFiles: integer("maxFiles").notNull().default(1),
    designWidth: numeric("designWidth", { precision: 12, scale: 3 }),
    designHeight: numeric("designHeight", { precision: 12, scale: 3 }),
    designUnit: text("designUnit").notNull().default("mm"),
    bleedWidth: numeric("bleedWidth", { precision: 12, scale: 3 }),
    bleedHeight: numeric("bleedHeight", { precision: 12, scale: 3 }),
    safeAreaWidth: numeric("safeAreaWidth", { precision: 12, scale: 3 }),
    safeAreaHeight: numeric("safeAreaHeight", { precision: 12, scale: 3 }),
    finalWidth: numeric("finalWidth", { precision: 12, scale: 3 }),
    finalHeight: numeric("finalHeight", { precision: 12, scale: 3 }),
    orientation: text("orientation"),
    pageInstructions: jsonb("pageInstructions").$type<Array<{ pageNumber: number; label: string; colorMode?: string | null; notes?: string | null; required?: boolean }>>().notNull().default([]),
    multiplePageInstructions: text("multiplePageInstructions"),
    additionalInstructions: text("additionalInstructions"),
    notes: text("notes"),
    isActive: boolean("isActive").notNull().default(true),
    ...timestamps,
  },
  (table) => [uniqueIndex("artwork_requirements_product_scope_idx").on(table.productId, table.scopeKey), index("artwork_requirements_pricing_rule_idx").on(table.pricingRuleId)],
);

export const artworkSlots = pgTable(
  "artwork_slots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    artworkRequirementId: uuid("artworkRequirementId").notNull().references(() => artworkRequirements.id, { onDelete: "cascade" }),
    pricingRuleId: uuid("pricingRuleId").references(() => pricingRules.id, { onDelete: "cascade" }),
    slotKey: text("slotKey").notNull(),
    name: text("name").notNull(),
    required: boolean("required").notNull().default(true),
    acceptedFormats: jsonb("acceptedFormats").$type<Array<"CDR">>().notNull().default(["CDR"]),
    maxFileSize: integer("maxFileSize"),
    instructions: text("instructions"),
    sortOrder: integer("sortOrder").notNull().default(0),
    isActive: boolean("isActive").notNull().default(true),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("artwork_slots_requirement_key_idx").on(table.artworkRequirementId, table.slotKey),
    index("artwork_slots_pricing_rule_idx").on(table.pricingRuleId),
  ],
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

export const locationSurcharges = pgTable(
  "location_surcharges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
    pricingRuleId: uuid("pricingRuleId").references(() => pricingRules.id, { onDelete: "cascade" }),
    locationScope: text("locationScope").notNull(),
    city: text("city"),
    stateCode: text("stateCode"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
    taxInclusive: boolean("taxInclusive").notNull().default(true),
    isActive: boolean("isActive").notNull().default(true),
    sortOrder: integer("sortOrder").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index("location_surcharges_product_idx").on(table.productId),
    index("location_surcharges_pricing_rule_idx").on(table.pricingRuleId),
  ],
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
  jobName: text("jobName"),
  calculatedAmount: numeric("calculatedAmount", { precision: 12, scale: 2 }),
  pricingSnapshot: jsonb("pricingSnapshot").$type<Record<string, unknown>>().notNull().default({}),
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
  taxRate: numeric("taxRate", { precision: 6, scale: 3 }),
  productionTime: text("productionTime"),
  sortOrder: integer("sortOrder").notNull().default(0),
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
  internalNotes: text("internalNotes"),
  customerMessage: text("customerMessage"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  taxableSubtotal: numeric("taxableSubtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  discountAmount: numeric("discountAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  tax: numeric("tax", { precision: 12, scale: 2 }).notNull().default("0"),
  taxType: text("taxType").notNull().default("INTRA_STATE"),
  taxRate: numeric("taxRate", { precision: 6, scale: 3 }).default("18.000"),
  cgstRate: numeric("cgstRate", { precision: 6, scale: 3 }).notNull().default("9.000"),
  cgstAmount: numeric("cgstAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  sgstRate: numeric("sgstRate", { precision: 6, scale: 3 }).notNull().default("9.000"),
  sgstAmount: numeric("sgstAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  igstRate: numeric("igstRate", { precision: 6, scale: 3 }).notNull().default("0.000"),
  igstAmount: numeric("igstAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  taxJurisdictionState: text("taxJurisdictionState").default("GJ"),
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
  jobName: text("jobName"),
  configuration: jsonb("configuration").$type<Record<string, unknown>>().notNull().default({}),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unitPrice", { precision: 12, scale: 2 }).notNull().default("0"),
  taxableAmount: numeric("taxableAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("taxAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  cgstAmount: numeric("cgstAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  sgstAmount: numeric("sgstAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  igstAmount: numeric("igstAmount", { precision: 12, scale: 2 }).notNull().default("0"),
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
  taxableSubtotal: numeric("taxableSubtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  tax: numeric("tax", { precision: 12, scale: 2 }).notNull().default("0"),
  taxType: text("taxType").notNull().default("INTRA_STATE"),
  taxRate: numeric("taxRate", { precision: 6, scale: 3 }).default("18.000"),
  cgstRate: numeric("cgstRate", { precision: 6, scale: 3 }).notNull().default("9.000"),
  cgstAmount: numeric("cgstAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  sgstRate: numeric("sgstRate", { precision: 6, scale: 3 }).notNull().default("9.000"),
  sgstAmount: numeric("sgstAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  igstRate: numeric("igstRate", { precision: 6, scale: 3 }).notNull().default("0.000"),
  igstAmount: numeric("igstAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  taxJurisdictionState: text("taxJurisdictionState").default("GJ"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  deliveryMethod: text("deliveryMethod"),
  deliveryState: text("deliveryState"),
  deliveryPrice: numeric("deliveryPrice", { precision: 12, scale: 2 }).notNull().default("0"),
  deliveryAddress: jsonb("deliveryAddress").$type<{ line1: string; line2?: string | null; city: string; state: string; stateCode?: string; postalCode: string; country: string }>(),
  notes: text("notes"),
  ...timestamps,
});

export const orderStatusEvents = pgTable(
  "order_status_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    notes: text("notes"),
    changedBy: uuid("changedBy").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("order_status_events_order_idx").on(table.orderId, table.createdAt)],
);

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("orderId")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("productId").references(() => products.id, { onDelete: "set null" }),
  variantId: uuid("variantId").references(() => productVariants.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  jobName: text("jobName"),
  configuration: jsonb("configuration").$type<Record<string, unknown>>().notNull().default({}),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unitPrice", { precision: 12, scale: 2 }).notNull().default("0"),
  taxableAmount: numeric("taxableAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("taxAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  cgstAmount: numeric("cgstAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  sgstAmount: numeric("sgstAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  igstAmount: numeric("igstAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  totalPrice: numeric("totalPrice", { precision: 12, scale: 2 }).notNull().default("0"),
  pricingSnapshot: jsonb("pricingSnapshot").$type<Record<string, unknown>>().notNull().default({}),
});

export const artworks = pgTable("artworks", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("orderId").references(() => orders.id, { onDelete: "set null" }),
  quoteId: uuid("quoteId").references(() => quotes.id, { onDelete: "set null" }),
  customerId: uuid("customerId").references(() => customers.id, { onDelete: "set null" }),
  productId: uuid("productId").references(() => products.id, { onDelete: "set null" }),
  pricingRuleId: uuid("pricingRuleId").references(() => pricingRules.id, { onDelete: "set null" }),
  artworkSlotId: uuid("artworkSlotId").references(() => artworkSlots.id, { onDelete: "set null" }),
  artworkSlotKey: text("artworkSlotKey").notNull().default("MAIN"),
  configuration: jsonb("configuration").$type<Record<string, unknown>>().notNull().default({}),
  fileName: text("fileName").notNull(),
  fileType: text("fileType").notNull(),
  extension: text("extension").notNull().default(".cdr"),
  mimeType: text("mimeType").notNull(),
  fileSize: integer("fileSize").notNull(),
  uploadedBy: uuid("uploadedBy").references(() => user.id, { onDelete: "set null" }),
  storageKey: text("storageKey"),
  storageUrl: text("storageUrl"),
  storageProvider: text("storageProvider").notNull().default("R2"),
  etag: text("etag"),
  replacesArtworkId: uuid("replacesArtworkId"),
  uploadExpiresAt: timestamp("uploadExpiresAt", { withTimezone: true }),
  previewUrl: text("previewUrl"),
  status: text("status").notNull().default("PENDING_REVIEW"),
  notes: text("notes"),
  replacedAt: timestamp("replacedAt", { withTimezone: true }),
  ...timestamps,
});

export const storedDocuments = pgTable(
  "stored_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentType: text("documentType").notNull(),
    entityType: text("entityType").notNull(),
    entityId: uuid("entityId").notNull(),
    customerId: uuid("customerId").references(() => customers.id, { onDelete: "set null" }),
    quoteId: uuid("quoteId").references(() => quotes.id, { onDelete: "cascade" }),
    orderId: uuid("orderId").references(() => orders.id, { onDelete: "cascade" }),
    storageKey: text("storageKey").notNull().unique(),
    originalFilename: text("originalFilename").notNull(),
    contentType: text("contentType").notNull(),
    fileSize: integer("fileSize").notNull(),
    etag: text("etag"),
    status: text("status").notNull().default("AVAILABLE"),
    isPrivate: boolean("isPrivate").notNull().default(true),
    createdBy: uuid("createdBy").references(() => user.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [index("stored_documents_customer_idx").on(table.customerId), index("stored_documents_quote_idx").on(table.quoteId), index("stored_documents_order_idx").on(table.orderId), index("stored_documents_entity_idx").on(table.entityType, table.entityId)],
);

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
  internalNotes: text("internalNotes"),
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
}, (table) => [uniqueIndex("payment_transactions_transaction_idx").on(table.transactionId)]);

export const walletTransactions = pgTable(
  "wallet_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customerId: uuid("customerId").notNull().references(() => customers.id, { onDelete: "cascade" }),
    transactionType: text("transactionType").notNull(),
    status: text("status").notNull().default("PENDING"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    balanceAfter: numeric("balanceAfter", { precision: 12, scale: 2 }),
    reference: text("reference"),
    notes: text("notes"),
    createdBy: uuid("createdBy").references(() => user.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [index("wallet_transactions_customer_idx").on(table.customerId)],
);
