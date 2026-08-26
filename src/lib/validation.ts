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
  productType: z.string().trim().max(40).default("CONFIGURABLE"),
  configuration: metadata,
  imageUrl: z.string().trim().max(500).optional(),
  orderable: z.boolean().default(false),
  quoteable: z.boolean().default(true),
  isActive: z.boolean().default(true),
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
  fileName: z.string().trim().min(1).max(255).refine((value) => value.toLowerCase().endsWith(".cdr"), "Only CorelDRAW .cdr files are accepted"),
  fileType: z.literal("cdr"),
  extension: z.literal(".cdr").default(".cdr"),
  mimeType: z.string().trim().max(120).default("application/octet-stream"),
  fileSize: z.number().int().positive().max(50_000_000),
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
});

export const adminPricingSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(2).max(160),
  ruleType: z.string().trim().max(40).default("PDF_PRICE_LIST"),
  conditions: metadata,
  priceFormula: metadata,
  isActive: z.boolean().default(true),
});

export const paymentSchema = z.object({
  orderId: z.string().uuid(),
  customerId: z.string().uuid().nullable().optional(),
  method: z.enum(["RAZORPAY", "COD"]),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
});

export const checkoutSchema = z.object({
  customer: z.object({
    contactName: z.string().trim().min(2).max(120),
    companyName: z.string().trim().min(2).max(160),
    phone: z.string().trim().min(8).max(30),
  }),
  paymentMethod: z.enum(["RAZORPAY", "COD"]),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive().max(1_000_000),
    configuration: metadata,
  })).min(1).max(25),
});

export const cartKindSchema = z.enum(["PURCHASE", "QUOTE"]);
export const cartItemSchema = z.object({
  kind: cartKindSchema,
  productId: z.string().uuid(),
  quantity: z.number().int().positive().max(1_000_000).default(1),
  configuration: metadata,
});
export const cartItemUpdateSchema = z.object({ quantity: z.number().int().positive().max(1_000_000), configuration: metadata.optional() });

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
  subtotal: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  tax: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  total: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  notes: z.string().trim().max(3000).optional(),
  validUntil: z.coerce.date().nullable().optional(),
});

export const adminOrderUpdateSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "ARTWORK_REVIEW", "ARTWORK_APPROVED", "IN_PRODUCTION", "QC", "READY", "DISPATCHED", "DELIVERED", "CANCELLED"]).optional(),
  notes: z.string().trim().max(3000).optional(),
});

export const artworkUpdateSchema = z.object({
  status: z.enum(["PENDING_REVIEW", "APPROVED", "CHANGES_REQUIRED", "REJECTED"]).optional(),
  notes: z.string().trim().max(1000).optional(),
  storageKey: z.string().trim().max(500).optional(),
  storageUrl: z.url().nullable().optional(),
});

export type QuoteInput = z.infer<typeof quoteSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
