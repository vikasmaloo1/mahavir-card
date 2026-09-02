export type RateCatalogItem = {
  slug: string;
  name: string;
  shortDescription: string;
  productionTime?: string;
  referenceQuantity?: number;
  referenceWeight?: number;
  ruleType: "FIXED_PER_REFERENCE_QUANTITY" | "FIXED" | "PER_SQ_INCH";
  amount?: number;
  netAmount?: number;
  taxRate?: number;
  ratePerSqInch?: number;
  rateUnit?: "RUPEES" | "PAISE";
  sourceDisplayedRate?: number;
  minimumArea?: number;
  minimumCharge?: number;
  bladeCharge?: number;
  size?: string;
  artwork: {
    design?: [number, number];
    safe?: [number, number];
    final?: [number, number];
    black?: string;
    slots: Array<{ key: string; name: string; instructions?: string }>;
  };
  addon?: { code: string; name: string; amount: number };
  delivery?: { GJ: number; RJ: number };
  quoteable?: boolean;
};

export type RateCatalogCategory = {
  slug: string;
  name: string;
  description: string;
  items: RateCatalogItem[];
};

const slot = (key: string, name: string, instructions?: string) => ({ key, name, instructions });
const visitingCardArtwork = (slots: RateCatalogItem["artwork"]["slots"], design: [number, number] = [90, 53], black = "C50 M20 Y20 K100"): RateCatalogItem["artwork"] => ({ design, safe: [83, 47], black, slots });
const artCardArtwork = (slots: RateCatalogItem["artwork"]["slots"]): RateCatalogItem["artwork"] => ({ black: "C50 M20 Y20 K100", slots });
const premiumArtwork = (slots: RateCatalogItem["artwork"]["slots"]): RateCatalogItem["artwork"] => ({ design: [93.5, 54], safe: [83, 47], final: [90, 53], black: "C50 M20 Y20 K100", slots });
const fixedCard = (slug: string, name: string, amount: number, productionTime: string, artwork: RateCatalogItem["artwork"], extra: Partial<RateCatalogItem> = {}): RateCatalogItem => ({ slug, name, amount, taxRate: 18, productionTime, referenceQuantity: 1000, referenceWeight: 1, ruleType: "FIXED_PER_REFERENCE_QUANTITY", shortDescription: `${name} for a reference batch of 1,000 cards.`, artwork, ...extra });
const fixed = (slug: string, name: string, amount: number, productionTime: string | undefined, size?: string): RateCatalogItem => ({ slug, name, amount, taxRate: 18, productionTime, size, referenceQuantity: 1000, ruleType: "FIXED", shortDescription: [name, size].filter(Boolean).join(" · "), artwork: { slots: [slot("DESIGN", "Design artwork")] } });
const ntCourier = { GJ: 40, RJ: 60 } as const;
const standardCourier = { GJ: 60, RJ: 80 } as const;
const premiumCourier = { GJ: 80, RJ: 100 } as const;
const cornerCutAddon = { code: "CORNER_CUT", name: "Corner Cut", amount: 300, referenceQuantity: 1000 } as const;

export const rateCatalog: RateCatalogCategory[] = [
  {
    slug: "visiting-card", name: "Visiting Card", description: "Standard, tearable, thermal matt, texture, and UV visiting cards.",
    items: [
      fixedCard("nt-single", "NT Single", 240, "2-3 working days", visitingCardArtwork([slot("DESIGN", "Design artwork")]), { delivery: ntCourier, quoteable: false }),
      fixedCard("nt-front-back", "NT Front Back", 280, "3-4 working days", visitingCardArtwork([slot("FRONT", "Front design"), slot("BACK", "Back design")]), { delivery: ntCourier, quoteable: false }),
      fixedCard("tearable-single-side", "Tearable Single Side Art Card 250 GSM", 210, "2-3 working days", visitingCardArtwork([slot("FRONT", "Front design")]), { delivery: standardCourier, quoteable: false }),
      fixedCard("tearable-front-back-without-lamination", "Tearable Front Back Without Lamination", 300, "3-4 working days", visitingCardArtwork([slot("FRONT", "Front design"), slot("BACK", "Back design")]), { delivery: standardCourier, quoteable: false }),
      fixedCard("tearable-front-back-with-lamination", "Tearable Front Back With Lamination", 320, "4-5 working days", visitingCardArtwork([slot("FRONT", "Front design"), slot("BACK", "Back design")]), { delivery: standardCourier, quoteable: false }),
      fixedCard("400-gsm-thermal-matt-single-front-back", "400 GSM Thermal Matt Single + Front Back", 480, "4-5 working days", visitingCardArtwork([slot("FRONT", "Front design"), slot("BACK", "Back design")], [92, 54], "C30 M0 Y0 K100"), { addon: cornerCutAddon, delivery: premiumCourier, quoteable: false }),
      fixedCard("350-gsm-thermal-matt-texture", "350 GSM Thermal Matt Texture", 700, "4-5 working days", visitingCardArtwork([slot("FRONT", "Front design"), slot("BACK", "Back design")], [92, 54], "C30 M0 Y0 K100"), { delivery: premiumCourier, quoteable: false }),
      fixedCard("400-gsm-thermal-matt-single-side-uv", "400 GSM Thermal Matt Single Side UV", 570, "5-7 working days", visitingCardArtwork([slot("FRONT", "Front Design File"), slot("BACK", "Back Design File"), slot("SPOT_UV", "Spot UV File", "Black and white only")], [92, 54], "C30 M0 Y0 K100"), { addon: cornerCutAddon, delivery: premiumCourier, quoteable: false, shortDescription: "Single / Front Back Printing" }),
      fixedCard("400-gsm-thermal-matt-front-back-uv", "400 GSM Thermal Matt Front Back UV", 670, "5-7 working days", visitingCardArtwork([slot("FRONT", "Front Design File"), slot("BACK", "Back Design File"), slot("SPOT_UV", "Spot UV File", "Black and white only")], [92, 54], "C30 M0 Y0 K100"), { addon: cornerCutAddon, delivery: premiumCourier, quoteable: false }),
    ],
  },
  {
    slug: "premium-card", name: "Premium Card", description: "Round-cut premium velvet, UV, foil, and drip-off cards. Corner cut included by default.",
    items: [
      fixedCard("premium-400-gsm-velvet", "400 GSM Velvet", 746, "7-10 working days", premiumArtwork([slot("FRONT", "Front design"), slot("BACK", "Back design")]), { referenceQuantity: 500, referenceWeight: 0.5, shortDescription: "400 GSM Velvet" }),
      fixedCard("premium-400-gsm-velvet-single-side-uv", "400 GSM Velvet Single Side UV", 848, "7-10 working days", premiumArtwork([slot("FRONT", "Front design"), slot("BACK", "Back design"), slot("SPOT_UV", "Spot UV separation", "Black and white only")]), { referenceQuantity: 500, referenceWeight: 0.5, shortDescription: "400 GSM Velvet Single Side UV" }),
      fixedCard("premium-400-gsm-velvet-front-back-uv", "400 GSM Velvet Front Back UV", 932, "7-10 working days", premiumArtwork([slot("FRONT", "Front design"), slot("BACK", "Back design"), slot("FRONT_SPOT_UV", "Front Spot UV separation", "Black and white only"), slot("BACK_SPOT_UV", "Back Spot UV separation", "Black and white only")]), { referenceQuantity: 500, referenceWeight: 0.5, shortDescription: "400 GSM Velvet Front Back UV" }),
      fixedCard("premium-400-gsm-velvet-single-side-foil", "400 GSM Velvet With Single Side Foil", 1017, "7-10 working days", premiumArtwork([slot("FRONT", "Front design"), slot("BACK", "Back design"), slot("FOIL", "Foil separation", "Black and white only")]), { referenceQuantity: 500, referenceWeight: 0.5, shortDescription: "400 GSM Velvet With Single Side Foil" }),
      fixedCard("premium-400-gsm-velvet-front-back-foil", "400 GSM Velvet With Front Back Foil", 1288, "7-10 working days", premiumArtwork([slot("FRONT", "Front design"), slot("BACK", "Back design"), slot("FRONT_FOIL", "Front foil separation", "Black and white only"), slot("BACK_FOIL", "Back foil separation", "Black and white only")]), { referenceQuantity: 500, referenceWeight: 0.5, shortDescription: "400 GSM Velvet With Front Back Foil" }),
      fixedCard("premium-400-gsm-dripoff-front-back", "400 GSM Drip-Off Front Back", 1102, "7-10 working days", premiumArtwork([slot("FRONT", "Front design"), slot("BACK", "Back design"), slot("FRONT_DRIPOFF", "Front drip-off separation", "Black and white only"), slot("BACK_DRIPOFF", "Back drip-off separation", "Black and white only")]), { referenceQuantity: 1000, referenceWeight: 1, shortDescription: "400 GSM Drip-Off Front Back" }),
    ].map((item) => ({ ...item, delivery: premiumCourier })),
  },
  {
    slug: "art-card", name: "Art Card", description: "250 GSM art card jobs priced by finished square-inch area for 1,000 quantity.",
    items: [
      { slug: "art-card-single-side", name: "250 GSM Art Card Single Side", shortDescription: "250 GSM · single side", ruleType: "PER_SQ_INCH", ratePerSqInch: 28, rateUnit: "RUPEES", productionTime: "3-4 working days", referenceQuantity: 1000, taxRate: 18, artwork: artCardArtwork([slot("FRONT", "Front design", "Recommended Black Color Ratio: C-50, M-20, Y-20, K-100 for achieving a rich, premium black in print")]) },
      { slug: "art-card-both-side", name: "250 GSM Art Card Both Side", shortDescription: "250 GSM · both sides · minimum 50 sq in", ruleType: "PER_SQ_INCH", ratePerSqInch: 33, rateUnit: "RUPEES", minimumArea: 50, productionTime: "3-4 working days", referenceQuantity: 1000, taxRate: 18, artwork: artCardArtwork([slot("FRONT", "Front design", "THIS JOB BIG SIZE ONLY (MINIMUM SQ. INCH 50). Recommended Black Color Ratio: C-50, M-20, Y-20, K-100 for achieving a rich, premium black in print"), slot("BACK", "Back design", "THIS JOB BIG SIZE ONLY (MINIMUM SQ. INCH 50). Recommended Black Color Ratio: C-50, M-20, Y-20, K-100 for achieving a rich, premium black in print")]) },
      { slug: "art-card-both-side-lamination", name: "250 GSM Art Card Both Side Lamination", shortDescription: "250 GSM · both sides · lamination", ruleType: "PER_SQ_INCH", ratePerSqInch: 37, rateUnit: "RUPEES", productionTime: "3-4 working days", referenceQuantity: 1000, taxRate: 18, artwork: artCardArtwork([slot("FRONT", "Front design", "Recommended Black Color Ratio: C-50, M-20, Y-20, K-100 for achieving a rich, premium black in print"), slot("BACK", "Back design", "Recommended Black Color Ratio: C-50, M-20, Y-20, K-100 for achieving a rich, premium black in print")]) },
    ],
  },
  {
    slug: "letterhead-envelope", name: "Letterhead / Envelope", description: "Letterheads and envelopes in the workbook paper and size combinations.",
    items: [
      fixed("letterhead-100-alabaster", "100 Alabaster Letterhead", 1150, "2-3 working days", "210 × 297 mm"),
      fixed("letterhead-80-gsm-ss-finish", "80 GSM SS Finish Letterhead", 1100, "3-4 working days", "210 × 297 mm"),
      fixed("letterhead-100-gsm-ss-finish", "100 GSM SS Finish Letterhead", 1250, "3-4 working days", "210 × 297 mm"),
      fixed("letterhead-100-alabaster-front-back", "100 Alabaster Front Back Letterhead", 2000, "4-5 working days", "210 × 297 mm"),
      fixed("envelope-100-alabaster", "100 Alabaster Envelope", 1450, "2-3 working days", "9.5 × 4.25 in"),
      fixed("envelope-80-gsm-ss-finish", "80 GSM SS Finish Envelope", 1400, "3-4 working days", "9.5 × 4.25 in"),
      fixed("envelope-100-gsm-ss-finish", "100 GSM SS Finish Envelope", 1550, "3-4 working days", "9.5 × 4.25 in"),
      fixed("cover-a4-130-gsm-art-paper", "A4 130 GSM Art Paper Envelope", 2100, "4-5 working days", "9.5 × 4.25 in"),
    ],
  },
  {
    slug: "brochure", name: "Brochure", description: "250 GSM art-card brochure formats from the workbook.",
    items: [
      fixed("brochure-a4-single-side", "A4 Single Side", 2600, "4-5 working days", "8.5 × 11.25 in"),
      fixed("brochure-a4-both-side-without-lamination", "A4 Both Side Without Lamination", 3000, "4-5 working days", "8.5 × 11.25 in"),
      fixed("brochure-a4-both-side-lamination", "A4 Both Side Lamination", 3600, "4-5 working days", "8.5 × 11.25 in"),
      fixed("brochure-a8-250-tearable-single-side", "A8 250 Tearable Single Side", 1300, "4-5 working days", "8.5 × 5.5 in"),
      fixed("brochure-a8-250-tearable-front-back", "A8 250 Tearable Front Back", 1500, "4-5 working days", "8.5 × 5.5 in"),
      fixed("brochure-a8-250-lamination-front-back", "A8 250 Lamination Front Back", 1800, "4-5 working days", "8.5 × 5.5 in"),
    ].map((item) => ({ ...item, quoteable: false })),
  },
  {
    slug: "leaflet-cover", name: "Leaflet", description: "A4 art-paper leaflet jobs.",
    items: [
      fixed("leaflet-a4-130-gsm-single-side", "A4 130 GSM Art Paper Single Side", 1700, "4-5 working days", "8.5 × 11.25 in"),
      fixed("leaflet-a4-130-gsm-front-back", "A4 130 GSM Art Paper Front Back", 2200, "2-3 working days", "8.5 × 11.25 in"),
      fixed("leaflet-a4-170-gsm-single-or-front-back", "A4 170 GSM Art Paper Single Side or Front Back", 2400, "4-5 working days", "8.5 × 11.25 in"),
    ],
  },
  {
    slug: "sticker", name: "Sticker", description: "Standard and Avery stickers priced by square inch with workbook minimums and blade charges.",
    items: [
      { slug: "sticker-without-lamination", name: "Sticker Without Lamination (80/90)", shortDescription: "Square-inch pricing · minimum charge ₹250.", ruleType: "PER_SQ_INCH", ratePerSqInch: 33, rateUnit: "PAISE", minimumCharge: 250, bladeCharge: 50, productionTime: "4-5 working days", referenceQuantity: 1000, taxRate: 18, quoteable: false, artwork: { slots: [slot("DESIGN", "Sticker design")] } },
      { slug: "sticker-with-lamination", name: "Sticker With Lamination (80/90)", shortDescription: "Square-inch pricing · minimum charge ₹300.", ruleType: "PER_SQ_INCH", ratePerSqInch: 37, rateUnit: "PAISE", minimumCharge: 300, bladeCharge: 50, productionTime: "4-5 working days", referenceQuantity: 1000, taxRate: 18, quoteable: false, artwork: { slots: [slot("DESIGN", "Sticker design")] } },
      { slug: "avery-sticker-without-lamination", name: "Avery Sticker Without Lamination", shortDescription: "Square-inch pricing · minimum charge ₹350.", ruleType: "PER_SQ_INCH", ratePerSqInch: 42, rateUnit: "PAISE", minimumCharge: 350, bladeCharge: 50, productionTime: "5-7 working days", referenceQuantity: 1000, taxRate: 18, quoteable: false, artwork: { slots: [slot("DESIGN", "Sticker design")] } },
      { slug: "avery-sticker-with-lamination", name: "Avery Sticker With Lamination", shortDescription: "Square-inch pricing · minimum charge ₹400.", ruleType: "PER_SQ_INCH", ratePerSqInch: 46, rateUnit: "PAISE", minimumCharge: 400, bladeCharge: 50, productionTime: "7-10 working days", referenceQuantity: 1000, taxRate: 18, quoteable: false, artwork: { slots: [slot("DESIGN", "Sticker design")] } },
    ],
  },
];
