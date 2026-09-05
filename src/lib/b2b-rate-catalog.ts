/**
 * B2B pricing overrides sourced from "PRICE LIST.xlsx" (owner-supplied, no GST).
 * Keyed by the same product slug used in rate-catalog.ts. Each entry only carries
 * the fields that differ for B2B — amount / rate — everything else (ruleType,
 * referenceQuantity, minimums, blade charges, production time) is reused from the
 * matching rate-catalog.ts item so the two price books stay structurally identical.
 */
export const b2bRateOverrides: Record<string, { amount?: number; ratePerSqInch?: number }> = {
  // Premium Card (velvet round-cut)
  "premium-400-gsm-velvet": { amount: 800 },
  "premium-400-gsm-velvet-single-side-uv": { amount: 900 },
  "premium-400-gsm-velvet-front-back-uv": { amount: 1000 },
  "premium-400-gsm-velvet-single-side-foil": { amount: 1100 },
  "premium-400-gsm-velvet-front-back-foil": { amount: 1400 },
  "premium-400-gsm-dripoff-front-back": { amount: 1200 },

  // Visiting Card
  "nt-single": { amount: 270 },
  "nt-front-back": { amount: 320 },
  "tearable-single-side": { amount: 240 },
  "tearable-front-back-without-lamination": { amount: 350 },
  "tearable-front-back-with-lamination": { amount: 350 },
  "350-gsm-thermal-matt-texture": { amount: 800 },
  "400-gsm-thermal-matt-single-front-back": { amount: 420 },
  "400-gsm-thermal-matt-single-side-uv": { amount: 520 },
  "400-gsm-thermal-matt-front-back-uv": { amount: 620 },

  // Art Card (per sq. inch)
  "art-card-single-side": { ratePerSqInch: 30 },
  "art-card-both-side": { ratePerSqInch: 35 },
  "art-card-both-side-lamination": { ratePerSqInch: 42 },

  // Letterhead / Envelope
  "letterhead-100-alabaster": { amount: 1250 },
  "letterhead-80-gsm-ss-finish": { amount: 1200 },
  "letterhead-100-gsm-ss-finish": { amount: 1350 },
  "letterhead-100-alabaster-front-back": { amount: 2200 },
  "envelope-100-alabaster": { amount: 1550 },
  "envelope-80-gsm-ss-finish": { amount: 1500 },
  "envelope-100-gsm-ss-finish": { amount: 1650 },
  "cover-a4-130-gsm-art-paper": { amount: 2300 },

  // Brochure
  "brochure-a4-single-side": { amount: 2800 },
  "brochure-a4-both-side-without-lamination": { amount: 3300 },
  "brochure-a4-both-side-lamination": { amount: 3800 },
  "brochure-a8-250-tearable-single-side": { amount: 1400 },
  "brochure-a8-250-tearable-front-back": { amount: 1650 },
  "brochure-a8-250-lamination-front-back": { amount: 1900 },

  // Leaflet
  "leaflet-a4-130-gsm-single-side": { amount: 1800 },
  "leaflet-a4-130-gsm-front-back": { amount: 2400 },
  "leaflet-a4-170-gsm-single-or-front-back": { amount: 2600 },

  // Sticker (per sq. inch)
  "sticker-without-lamination": { ratePerSqInch: 35 },
  "sticker-with-lamination": { ratePerSqInch: 40 },
  "avery-sticker-without-lamination": { ratePerSqInch: 45 },
  "avery-sticker-with-lamination": { ratePerSqInch: 50 },
};
