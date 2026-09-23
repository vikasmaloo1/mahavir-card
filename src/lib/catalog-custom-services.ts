/**
 * Custom / commercial print work that is quoted per specification rather than rated per batch.
 * Lives here, not in the catalogue page, so /catalog and the PDF export render the same list.
 * Every entry is quote-based, so nothing in it carries a price in any mode.
 */
export type CatalogCustomService = {
  key: string;
  title: string;
  subtitle: string;
  image: string;
  specs: string[];
  sizes: string;
  turnaround: string;
};

export const catalogCustomServices: CatalogCustomService[] = [
  {
    title: "1. Books, Catalogues & Multi-Page Publications",
    subtitle: "Annual Reports · Product Catalogues · Manuals · Magazines",
    image: "/images/products/luxury-brochures-ad.jpg",
    key: "books",
    specs: [
      "Binding Systems: Perfect binding (hot-melt / PUR glue), saddle-stitch wire pins, section-sewn hardcover casing, Wire-O & spiral.",
      "Paper Substrates: Maplitho (70 to 100 GSM), Art Paper (90 to 170 GSM), High-Bulk Cream / Alabaster, Full 4-Color or B/W.",
      "Cover Enhancements: Thermal Matt / Gloss lamination, Velvet touch, Spot UV, Gold/Silver hot-stamp foil, Embossing.",
    ],
    sizes: "Sizes: A4, A5, B5, Crown 1/4",
    turnaround: "5-7 working days",
  },
  {
    title: "2. Custom Corporate Diaries & Planners",
    subtitle: "Executive PU Leatherette · Dated & Undated Planners · Organizers",
    image: "/images/products/executive-diaries-ad.jpg",
    key: "diaries",
    specs: [
      "Cover Styling: Premium PU leatherette, hardbound thermal matt, thermo-PU debossing, two-tone stitch finishing.",
      "Personalization: Blind debossing, metallic foil stamping, custom full-color tip-in pages (company profile & highlights).",
      "Accessories: Silk satin bookmark ribbon, elastic band closure, and magnetic clip locks.",
    ],
    sizes: "Formats: Day-per-Page, Week-to-View, Executive A5",
    turnaround: "7-10 working days",
  },
  {
    title: "3. Carbonless Bill Books, Challans & Receipt Vouchers",
    subtitle: "Duplicate · Triplicate · Quadruplicate Book Sets · Numbered",
    image: "/images/products/letterhead-envelope-duo.jpg",
    key: "bill-books",
    specs: [
      "Paper Grade: 55-60 GSM high-sensitivity self-copy paper (White, Pink, Yellow, Green, Blue) — clean and smudge-free.",
      "Numbering & Perforation: Sharp 6-digit consecutive red ink numbering, ultra-fine micro-perforation for clean tear-out.",
      "Binding & Protection: Stiff strawboard backing, heavy kraft cover, and integrated fold-in write shield protector card.",
    ],
    sizes: "Standard Sizes: 1/4 (A4), 1/6, 1/8",
    turnaround: "3-5 working days",
  },
  {
    title: "4. Presentation Folders & Corporate Stationery Kits",
    subtitle: "Document Folders · Proposal Folders · Certificate Jackets",
    image: "/images/products/presentation-folder-ad.jpg",
    key: "presentation-folders",
    specs: [
      "Folder Board: 350-400 GSM imported Art Card with high stiffness and crease-resistant scoring.",
      "Pocket Engineering: Single or double die-cut glued pockets with business card slit holder.",
      "Surface Lamination: Thermal Matt or Soft-Touch Velvet with selective raised Spot UV highlights.",
    ],
    sizes: "Fits standard A4 (9\" × 12\" closed)",
    turnaround: "4-6 working days",
  },
  {
    title: "5. Custom Packaging Boxes & Monocartons",
    subtitle: "Product Boxes · Cosmetic Cartons · Pharma Sleeves · Gift Boxes",
    image: "/images/products/packaging-boxes-ad.jpg",
    key: "packaging",
    specs: [
      "Board Grades: 300 to 450 GSM FBB (Folding Box Board), SBS Board, and Duplex grey-back board.",
      "Die Punching & Gluing: High-precision laser die punching, window patching with clear PET sheet, and auto-lock bottoms.",
      "Special Effects: Hybrid drip-off textured varnish, metallic foil embossing, and anti-scuff matte finish.",
    ],
    sizes: "Customized to product dimensions",
    turnaround: "7-10 working days",
  },
  {
    title: "6. Premium Branded Paper Bags & Shopping Bags",
    subtitle: "Retail Bags · Exhibition Bags · Boutique Carry Bags · Kraft Bags",
    image: "/images/products/paper-bags-ad.jpg",
    key: "paper-bags",
    specs: [
      "Paper Substrates: 170-300 GSM Art Paper with lamination or 150-250 GSM Eco-friendly Brown/White Virgin Kraft.",
      "Handles & Reinforcement: Twisted paper rope, braided cotton cord, or satin ribbon handles with eyelet reinforcement.",
      "Base Card: Heavy bottom stiffener card for high weight-bearing durability.",
    ],
    sizes: "Small, Medium, Large & Custom Bottega Sizes",
    turnaround: "6-8 working days",
  },
  {
    title: "7. Hospital & Medical OPD / IPD File Folders",
    subtitle: "Patient Case History Folders · Pathology Report Jackets · Hospital Files",
    image: "/images/products/medical-file-folder-ad.jpg",
    key: "medical-files",
    specs: [
      "Board Grade: 300-350 GSM heavy laminated Art Card or calibrated kraft board.",
      "Fasteners & Clips: High-strength plastic cobra clips or flexible 2-hole wire prongs.",
      "Internal Storage: Dedicated pockets for prescription slips, X-ray envelopes, and doctor consultation sheets.",
    ],
    sizes: "Standard Medical A4 & Legal 10\" × 14\"",
    turnaround: "4-6 working days",
  },
  {
    title: "8. Security Vouchers, Coupons & Barcoded Passes",
    subtitle: "Gift Vouchers · Event Entry Passes · Loyalty Discount Coupons",
    image: "/images/products/gold-edge-luxury-card.jpg",
    key: "security-vouchers",
    specs: [
      "Security Technology: Variable data alphanumeric serials, 1D/2D QR barcodes, and anti-counterfeiting guilloche patterns.",
      "Features: Scratch-off latex foil coating, dual counterfoil perforations, and security pantographs.",
      "Substrates: 130 to 300 GSM coated art card or security tearable synthetic substrates.",
    ],
    sizes: "Standard Ticket & Wallet Sizes",
    turnaround: "3-5 working days",
  },
];
