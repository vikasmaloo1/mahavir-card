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
  fileName: z.string().trim().min(1).max(255),
  fileType: z.string().trim().min(1).max(40),
  mimeType: z.string().trim().min(1).max(120),
  fileSize: z.number().int().positive().max(50_000_000),
  storageKey: z.string().trim().max(500).optional(),
  storageUrl: z.url().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export type QuoteInput = z.infer<typeof quoteSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
