import { z } from "zod";

const metadata = z.record(z.string(), z.unknown()).default({});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().trim().max(500).optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const productSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(2).max(180).regex(/^[a-z0-9-]+$/),
  description: z.string().trim().max(2000).optional(),
  shortDescription: z.string().trim().max(500).optional(),
  productCode: z.string().trim().max(100).optional(),
  productReference: z.string().trim().max(100).optional(),
  productClass: z.string().trim().max(100).optional(),
  productType: z.string().trim().max(40).default("CONFIGURABLE"),
  configuration: metadata,
  imageUrl: z.string().trim().max(500).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "DISABLED", "ARCHIVED"]).default("ACTIVE"),
  orderable: z.boolean().default(false),
  quoteable: z.boolean().default(true),
  isActive: z.boolean().default(true),
  productionTime: z.string().trim().max(100).optional(),
  artworkRequired: z.boolean().default(false),
  artworkInstructions: z.string().trim().max(2000).optional(),
  sortOrder: z.number().int().min(0).default(0),
  referenceQuantity: z.number().int().positive().nullable().optional(),
  referenceWeight: z.string().regex(/^\d+(\.\d{1,3})?$/).nullable().optional(),
  referenceWeightUnit: z.string().trim().max(20).nullable().optional(),
  pricesTaxInclusive: z.boolean().default(true),
  archivedAt: z.coerce.date().nullable().optional(),
});

export const addonSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(80).regex(/^[A-Z0-9_-]+$/i),
  description: z.string().trim().max(1000).optional(),
  pricingType: z.enum(["FIXED", "PER_UNIT", "CUSTOM"]).default("FIXED"),
  priceConfiguration: metadata,
  isActive: z.boolean().default(true),
});

export const productImageSchema = z.object({
  imageUrl: z.url().max(500),
  storageKey: z.string().trim().max(500).optional(),
  altText: z.string().trim().max(300).optional(),
  sortOrder: z.number().int().min(0).default(0),
  isPrimary: z.boolean().default(false),
});

export const productContentSectionSchema = z.object({
  title: z.string().trim().min(2).max(160),
  sortOrder: z.number().int().min(0).default(0),
});

export const productContentItemSchema = z.object({
  label: z.string().trim().max(160).nullable().optional(),
  content: z.string().trim().min(1).max(3000),
  sortOrder: z.number().int().min(0).default(0),
});

export const productAddonSchema = z.object({
  pricingRuleId: z.string().uuid().nullable().optional(),
  addonId: z.string().uuid(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
  taxInclusive: z.boolean().default(true),
});

const optionalDimension = z.string().regex(/^\d+(\.\d{1,3})?$/).nullable().optional();

export const artworkRequirementSchema = z.object({
  pricingRuleId: z.string().uuid().nullable().optional(),
  artworkRequired: z.boolean().default(false),
  acceptedFormats: z.array(z.literal("CDR")).length(1).default(["CDR"]),
  minFileSize: z.number().int().positive().nullable().optional(),
  maxFileSize: z.number().int().positive().nullable().optional(),
  maxFiles: z.number().int().min(1).max(10).default(1),
  designWidth: optionalDimension,
  designHeight: optionalDimension,
  designUnit: z.string().trim().min(1).max(20).default("mm"),
  bleedWidth: optionalDimension,
  bleedHeight: optionalDimension,
  safeAreaWidth: optionalDimension,
  safeAreaHeight: optionalDimension,
  finalWidth: optionalDimension,
  finalHeight: optionalDimension,
  orientation: z.enum(["PORTRAIT", "LANDSCAPE", "SQUARE", "ANY"]).nullable().optional(),
  pageInstructions: z.array(z.object({
    pageNumber: z.number().int().positive().max(20),
    label: z.string().trim().min(1).max(160),
    colorMode: z.string().trim().max(80).nullable().optional(),
    notes: z.string().trim().max(500).nullable().optional(),
    required: z.boolean().default(true),
  })).max(20).default([]),
  multiplePageInstructions: z.string().trim().max(2000).nullable().optional(),
  additionalInstructions: z.string().trim().max(3000).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  isActive: z.boolean().default(true),
});

export const artworkSlotSchema = z.object({
  pricingRuleId: z.string().uuid().nullable().optional(),
  slotKey: z.string().trim().min(1).max(80).regex(/^[A-Z0-9_-]+$/i),
  name: z.string().trim().min(2).max(160),
  required: z.boolean().default(true),
  acceptedFormats: z.array(z.literal("CDR")).length(1).default(["CDR"]),
  maxFileSize: z.number().int().positive().nullable().optional(),
  instructions: z.string().trim().max(1000).nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const productDeliveryRuleSchema = z.object({
  deliveryMethod: z.enum(["PICKUP", "LOCAL_DELIVERY", "COURIER"]),
  stateCode: z.enum(["*", "GJ", "RJ"]).default("*"),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
  taxInclusive: z.boolean().default(false),
});

export const locationSurchargeSchema = z.object({
  pricingRuleId: z.string().uuid().nullable().optional(),
  locationScope: z.enum(["CITY", "OUTSIDE_CITY", "STATE", "OUTSIDE_STATE"]),
  city: z.string().trim().min(2).max(100).nullable().optional(),
  stateCode: z.string().trim().min(2).max(3).toUpperCase().nullable().optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  taxInclusive: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export const quoteSchema = z.object({
  contactName: z.string().trim().min(2).max(120),
  email: z.email(),
  phone: z.string().trim().max(30).optional(),
  companyName: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(3000).optional(),
  items: z.array(z.object({
    productId: z.string().uuid().nullable().optional(),
    variantId: z.string().uuid().nullable().optional(),
    description: z.string().trim().min(2).max(500),
    jobName: z.string().trim().max(160).nullable().optional(),
    configuration: metadata,
    quantity: z.number().int().positive().max(1_000_000),
    unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).default("0"),
  })).min(1).max(100),
});

export const orderSchema = z.object({
  quoteId: z.string().uuid().nullable().optional(),
  customerId: z.string().uuid().nullable().optional(),
  notes: z.string().trim().max(3000).optional(),
  items: z.array(z.object({
    productId: z.string().uuid().nullable().optional(),
    variantId: z.string().uuid().nullable().optional(),
    description: z.string().trim().min(2).max(500),
    jobName: z.string().trim().max(160).nullable().optional(),
    configuration: metadata,
    quantity: z.number().int().positive().max(1_000_000),
    unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).default("0"),
  })).min(1).max(100),
});

export const leadSchema = z.object({
  companyName: z.string().trim().max(160).optional(),
  contactName: z.string().trim().min(2).max(120),
  email: z.email(),
  phone: z.string().trim().max(30).optional(),
  message: z.string().trim().max(3000).optional(),
  source: z.string().trim().max(40).default("WEBSITE"),
  requirement: metadata,
});

export const artworkSchema = z.object({
  orderId: z.string().uuid().nullable().optional(),
  quoteId: z.string().uuid().nullable().optional(),
  customerId: z.string().uuid().nullable().optional(),
  productId: z.string().uuid(),
  pricingRuleId: z.string().uuid().nullable().optional(),
  configuration: metadata,
  fileName: z.string().trim().min(1).max(255).refine((value) => value.toLowerCase().endsWith(".cdr"), "Only CorelDRAW .cdr files are accepted"),
  fileType: z.literal("cdr"),
  extension: z.literal(".cdr").default(".cdr"),
  mimeType: z.string().trim().max(120).default("application/octet-stream"),
  fileSize: z.number().int().positive(),
  storageKey: z.string().trim().max(500).optional(),
  storageUrl: z.url().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const inquirySchema = z.object({
  companyName: z.string().trim().max(160).optional(),
  contactName: z.string().trim().min(2).max(120),
  email: z.email(),
  phone: z.string().trim().max(30).optional(),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(5).max(3000),
  source: z.string().trim().max(40).default("WEBSITE"),
  requirement: metadata,
});

export const pricingCalculateSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive().max(1_000_000),
  options: metadata,
  addonIds: z.array(z.string().uuid()).max(50).default([]),
  stateCode: z.string().trim().max(10).optional(),
  delivery: z.object({
    method: z.enum(["PICKUP", "LOCAL_DELIVERY", "COURIER"]),
    stateCode: z.string().trim().min(1).max(100).default("*"),
  }).optional(),
});

export const quoteSubmitSchema = z.object({
  contactName: z.string().trim().min(2).max(120),
  email: z.email(),
  phone: z.string().trim().max(30).optional(),
  companyName: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(3000).optional(),
});

export const adminPricingSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(2).max(160),
  ruleType: z.string().trim().max(40).default("PDF_PRICE_LIST"),
  conditions: metadata,
  priceFormula: metadata,
  taxRate: z.string().regex(/^\d+(\.\d{1,3})?$/).nullable().optional(),
  productionTime: z.string().trim().max(100).nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
  taxInclusive: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const noticeSchema = z.object({
  title: z.string().trim().min(2).max(160),
  message: z.string().trim().min(2).max(2000),
  tone: z.enum(["INFO", "WARNING", "SUCCESS"]).default("INFO"),
  placement: z.enum(["GLOBAL", "HOME", "ORDERING"]).default("GLOBAL"),
  animationType: z.enum(["MARQUEE", "STATIC"]).default("MARQUEE"),
  priority: z.enum(["HIGH", "NORMAL", "LOW"]).default("NORMAL"),
  linkLabel: z.string().trim().max(80).nullable().optional(),
  linkUrl: z.string().trim().max(500).nullable().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const adminNoticeSchema = noticeSchema;

export const bannerSchema = z.object({
  title: z.string().trim().min(2).max(200),
  subtitle: z.string().trim().max(1000).nullable().optional(),
  badge: z.string().trim().max(80).nullable().optional(),
  ctaLabel: z.string().trim().max(80).nullable().optional(),
  ctaUrl: z.string().trim().max(500).nullable().optional(),
  imageUrl: z.string().trim().max(1000).nullable().optional(),
  storageKey: z.string().trim().max(500).nullable().optional(),
  mobileImageUrl: z.string().trim().max(1000).nullable().optional(),
  mobileStorageKey: z.string().trim().max(500).nullable().optional(),
  composition: z.enum(["SPLIT_RIGHT", "SPLIT_LEFT", "FULL_BLEED_OVERLAY", "CINEMATIC_WIDE"]).default("SPLIT_RIGHT"),
  placement: z.enum(["HOME_HERO", "HOME_HERO_BOTTOM", "HOME_MID", "CATALOG_TOP", "CART_CHECKOUT", "GLOBAL"]).default("HOME_HERO_BOTTOM"),
  animationType: z.enum(["FADE", "SLIDE_UP", "IMAGE_ZOOM", "NONE"]).default("FADE"),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const adminBannerSchema = bannerSchema;

export const paymentSchema = z.object({
  orderId: z.string().uuid(),
  customerId: z.string().uuid().nullable().optional(),
  method: z.enum(["RAZORPAY", "COD", "CREDIT", "UPI_QR"]),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
});

export const adminPaymentSchema = paymentSchema.extend({
  method: z.enum(["RAZORPAY", "COD", "CREDIT", "UPI_QR", "MANUAL"]),
  status: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED", "COD_PENDING", "COD_COLLECTED", "CREDIT_APPROVED"]).default("PAID"),
  provider: z.string().trim().max(80).nullable().optional(),
  providerOrderId: z.string().trim().max(160).nullable().optional(),
  providerPaymentId: z.string().trim().max(160).nullable().optional(),
  codCollectedAt: z.coerce.date().nullable().optional(),
});

export const adminPaymentUpdateSchema = adminPaymentSchema.omit({ orderId: true }).partial();

export const checkoutSchema = z.object({
  customer: z.object({
    contactName: z.string().trim().min(2).max(120),
    companyName: z.string().trim().min(2).max(160),
    phone: z.string().trim().min(8).max(30),
  }),
  address: z.object({
    line1: z.string().trim().min(3).max(200),
    line2: z.string().trim().max(200).optional(),
    city: z.string().trim().min(2).max(100),
    state: z.string().trim().min(2).max(100),
    stateCode: z.string().trim().length(2).toUpperCase(),
    postalCode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit postal code"),
    country: z.string().trim().min(2).max(80).default("India"),
  }),
  paymentMethod: z.enum(["RAZORPAY", "COD", "CREDIT", "UPI_QR"]),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive().max(1_000_000),
    configuration: metadata,
  })).max(25).optional(),
});

export const cartKindSchema = z.enum(["PURCHASE", "QUOTE"]);
export const cartItemSchema = z.object({
  kind: cartKindSchema,
  productId: z.string().uuid(),
  quantity: z.number().int().positive().max(1_000_000).default(1),
  jobName: z.string().trim().max(160).nullable().optional(),
  configuration: metadata,
});
export const cartItemUpdateSchema = z.object({ quantity: z.number().int().positive().max(1_000_000), jobName: z.string().trim().max(160).nullable().optional(), configuration: z.record(z.string(), z.unknown()).optional() });

export const customerOnboardingSchema = z.object({
  customerType: z.enum(["B2B", "B2C"]),
  contactName: z.string().trim().min(2).max(120),
  companyName: z.string().trim().max(160).nullable().optional(),
  phone: z.string().trim().min(10).max(20),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  stateCode: z.string().trim().min(2).max(3).toUpperCase(),
  gstNumber: z.string().trim().toUpperCase().regex(/^[0-9A-Z]{15}$/, "Enter a valid 15-character GSTIN").nullable().optional(),
});

export const customerProfileUpdateSchema = z.object({
  customerType: z.enum(["B2B", "B2C"]).optional(),
  contactName: z.string().trim().min(2).max(120),
  companyName: z.string().trim().max(160).nullable().optional(),
  phone: z.string().trim().min(10).max(20),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  stateCode: z.enum(["GJ", "RJ"]),
  gstNumber: z.string().trim().toUpperCase().regex(/^[0-9A-Z]{15}$/, "Enter a valid 15-character GSTIN").nullable().optional().or(z.literal("")),
  address: z.object({
    line1: z.string().trim().min(3).max(200),
    line2: z.string().trim().max(200).nullable().optional(),
    postalCode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit postal code"),
  }).nullable().optional(),
});

export const adminCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email(),
  phoneNumber: z.string().trim().min(10).max(20).optional(),
  password: z.string().min(8).max(128),
});

export const adminUpdateSchema = z.object({
  phoneNumber: z.string().trim().min(10).max(20).nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const adminQuoteUpdateSchema = z.object({
  status: z.enum(["NEW", "REVIEWING", "QUOTE_CREATED", "SENT_TO_CUSTOMER", "CUSTOMER_APPROVED", "CUSTOMER_REJECTED", "EXPIRED", "CONVERTED_TO_ORDER", "CANCELLED"]).optional(),
  notes: z.string().trim().max(3000).optional(),
  internalNotes: z.string().trim().max(5000).nullable().optional(),
  customerMessage: z.string().trim().max(3000).nullable().optional(),
  discountAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  tax: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  validUntil: z.coerce.date().nullable().optional(),
});

export const adminQuoteItemSchema = z.object({
  productId: z.string().uuid().nullable().optional(),
  variantId: z.string().uuid().nullable().optional(),
  description: z.string().trim().min(2).max(500),
  configuration: metadata,
  quantity: z.number().int().positive().max(1_000_000),
  unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
});

export const businessSettingsSchema = z.object({
  businessName: z.string().trim().min(2).max(160),
  addressLine1: z.string().trim().max(200).nullable().optional(),
  addressLine2: z.string().trim().max(200).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  state: z.string().trim().max(100).nullable().optional(),
  postalCode: z.string().trim().max(20).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  email: z.email().nullable().optional(),
  whatsapp: z.string().trim().max(30).nullable().optional(),
  businessHours: z.string().trim().max(500).nullable().optional(),
  footerText: z.string().trim().max(1000).nullable().optional(),
  logoAssetId: z.string().uuid().nullable().optional(),
});

export const adminOrderUpdateSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "ARTWORK_REVIEW", "ARTWORK_APPROVED", "IN_PRODUCTION", "QC", "READY", "DISPATCHED", "DELIVERED", "CANCELLED"]).optional(),
  notes: z.string().trim().max(3000).optional(),
});

export const artworkUpdateSchema = z.object({
  status: z.enum(["PENDING_REVIEW", "APPROVED", "CHANGES_REQUIRED", "REJECTED"]).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const termSchema = z.object({
  title: z.string().trim().min(2).max(250),
  titleGu: z.string().trim().max(250).nullable().optional(),
  titleHi: z.string().trim().max(250).nullable().optional(),
  content: z.string().trim().min(5).max(5000),
  contentGu: z.string().trim().max(5000).nullable().optional(),
  contentHi: z.string().trim().max(5000).nullable().optional(),
  category: z.string().trim().min(2).max(50).default("GENERAL"),
  isImportant: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type QuoteInput = z.infer<typeof quoteSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
export type TermInput = z.infer<typeof termSchema>;
