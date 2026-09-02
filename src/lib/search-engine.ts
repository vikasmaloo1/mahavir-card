/**
 * Mahavir Card — Intelligent Product Search & Relevance Engine
 *
 * Implements:
 * - Print terminology normalization & synonym mapping
 * - Typo tolerance via Levenshtein edit distance
 * - GSM & dimensional parsing (e.g. 2x3, 400 GSM, A4, A8)
 * - 6-tier weighted relevance scoring
 * - Confidence thresholding (HIGH, PARTIAL, NONE)
 * - Automatic requirement extraction for seamless quotation fallback
 */

export type SearchConfidence = "HIGH" | "PARTIAL" | "NONE";

export type ExtractedRequirement = {
  categorySlug?: string;
  categoryName?: string;
  productName?: string;
  gsm?: string;
  size?: string;
  finish?: string;
  quantity?: number;
};

export type ScoredProduct<T> = {
  item: T;
  score: number;
  matchReasons: string[];
};

export type SearchEngineResult<T> = {
  query: string;
  normalizedQuery: string;
  confidence: SearchConfidence;
  matchReason: string;
  results: T[];
  total: number;
  fallbackQuoteAvailable: boolean;
  extractedRequirement: ExtractedRequirement;
};

// Common print terminology synonym dictionary
const SYNONYM_MAP: Record<string, string> = {
  // Visiting card / Business card variants
  "business card": "visiting card",
  "business crd": "visiting card",
  "visiting crd": "visiting card",
  "vistng card": "visiting card",
  "vistng crd": "visiting card",
  "bcard": "visiting card",
  "biz card": "visiting card",
  "vcard": "visiting card",

  // Thermal matt
  "thermel matt": "thermal matt",
  "thermel": "thermal",
  "thermal matt": "thermal matt",
  "thermal": "thermal",

  // Letterhead & Envelopes
  "letter head": "letterhead",
  "ltrhead": "letterhead",
  "letter heads": "letterhead",
  "envelop": "envelope",
  "envelops": "envelope",
  "envelopes": "envelope",
  "lifafa": "envelope",

  // Stickers & Labels
  "stikar": "sticker",
  "stiker": "sticker",
  "stikars": "sticker",
  "labels": "sticker",
  "label": "sticker",
  "stickers": "sticker",

  // Brochures & Catalogues
  "brocher": "brochure",
  "brochers": "brochure",
  "brochures": "brochure",
  "catalog": "brochure",
  "catalogue": "brochure",
  "catalogues": "brochure",
  "pamphlet": "brochure",
  "pamphlets": "brochure",
  "flyer": "brochure",
  "flyers": "brochure",

  // Finishes
  "spot uv": "spot uv",
  "spotuv": "spot uv",
  "spot-uv": "spot uv",
  "spot gloss": "spot uv",
  "gloss uv": "spot uv",
  "gloss": "gloss",
  "velvet": "velvet",
  "soft touch": "velvet",
  "foil": "foil",
  "gold foil": "foil",
  "stamping": "foil",
  "drip off": "drip-off",
  "dripoff": "drip-off",
  "drip": "drip-off",
  "both side": "both side",
  "f-b": "both side",
  "fb": "both side",
  "front back": "both side",
  "front & back": "both side",
  "double side": "both side",
  "single side": "single side",
  "single": "single side",
  "corner cut": "round cut",
  "cornercut": "round cut",
  "round cut": "round cut",
  "roundcut": "round cut",
  "tearable": "tearable",
  "non tearable": "nt",
  "non-tearable": "nt",
};

/**
 * Computes Levenshtein edit distance between two strings
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const val = Math.min(row[j] + 1, prev + 1, row[j - 1] + cost);
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

/**
 * Checks if token b matches token a with typo tolerance
 */
export function isFuzzyMatch(target: string, queryToken: string): boolean {
  if (target === queryToken || target.includes(queryToken)) return true;
  if (queryToken.length < 4) return false;

  const maxDist = queryToken.length >= 6 ? 2 : 1;
  const dist = levenshtein(target, queryToken);
  return dist <= maxDist;
}

/**
 * Normalizes customer search query into clean tokens and expands synonyms
 */
export function normalizeQuery(query: string): {
  normalized: string;
  tokens: string[];
  dimensions: string[];
  gsmValues: string[];
  extractedQuantity?: number;
} {
  let cleaned = query
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\.\*xX\-\/]/g, " ")
    .replace(/\s+/g, " ");

  // Extract dimensions: e.g. 2x3, 2 x 3, 3*4, 90x53
  const dimensions: string[] = [];
  const dimRegex = /\b(\d+(?:\.\d+)?)\s*(?:x|\*|by)\s*(\d+(?:\.\d+)?)\b/gi;
  let dimMatch: RegExpExecArray | null;
  while ((dimMatch = dimRegex.exec(cleaned)) !== null) {
    dimensions.push(`${dimMatch[1]}x${dimMatch[2]}`);
  }

  // Extract GSM values: e.g. 400 gsm, 400gsm, 250 gsm
  const gsmValues: string[] = [];
  const gsmRegex = /\b(80|90|100|130|170|250|300|350|400)\s*(?:gsm|g|gm)?\b/gi;
  let gsmMatch: RegExpExecArray | null;
  while ((gsmMatch = gsmRegex.exec(cleaned)) !== null) {
    if (cleaned.includes("gsm") || ["80", "100", "130", "170", "250", "350", "400"].includes(gsmMatch[1])) {
      gsmValues.push(`${gsmMatch[1]} GSM`);
    }
  }

  // Extract quantity if >= 50 mentioned: e.g. 1000, 2000, 500
  let extractedQuantity: number | undefined;
  const qtyMatch = cleaned.match(/\b(500|1000|2000|3000|4000|5000|10000)\b/);
  if (qtyMatch) {
    extractedQuantity = Number(qtyMatch[1]);
  }

  // Apply synonym mapping with longest phrases first and boundary matching
  const sortedSynonyms = Object.entries(SYNONYM_MAP).sort((a, b) => b[0].length - a[0].length);
  let expanded = ` ${cleaned} `;
  for (let i = 0; i < sortedSynonyms.length; i++) {
    const [key] = sortedSynonyms[i];
    const regex = new RegExp(`(?<=\\s)${key}(?=\\s)`, "gi");
    if (regex.test(expanded)) {
      expanded = expanded.replace(regex, ` __SYN_${i}__ `);
    }
  }
  for (let i = 0; i < sortedSynonyms.length; i++) {
    expanded = expanded.replaceAll(`__SYN_${i}__`, sortedSynonyms[i][1]);
  }

  const tokens = Array.from(
    new Set(
      expanded
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 1 && !["the", "for", "and", "with", "in", "of"].includes(t))
    )
  );

  return {
    normalized: expanded.trim(),
    tokens,
    dimensions,
    gsmValues,
    extractedQuantity,
  };
}

/**
 * Extracts structured requirement hints from customer query for pre-filling quote form
 */
export function extractRequirement(query: string): ExtractedRequirement {
  const norm = normalizeQuery(query);
  const q = norm.normalized.toLowerCase();

  let categorySlug: string | undefined;
  let categoryName: string | undefined;

  if (q.includes("visiting") || q.includes("business card") || q.includes("card")) {
    if (q.includes("velvet") || q.includes("drip") || q.includes("foil") || q.includes("round") || q.includes("texture")) {
      categorySlug = "premium-card";
      categoryName = "Premium Card";
    } else {
      categorySlug = "visiting-card";
      categoryName = "Visiting Card";
    }
  } else if (q.includes("brochure") || q.includes("catalog") || q.includes("pamphlet")) {
    categorySlug = "brochure";
    categoryName = "Brochure";
  } else if (q.includes("sticker") || q.includes("label") || q.includes("adhesive")) {
    categorySlug = "sticker";
    categoryName = "Sticker";
  } else if (q.includes("letterhead") || q.includes("envelope") || q.includes("stationery")) {
    categorySlug = "letterhead-envelope";
    categoryName = "Letterhead / Envelope";
  } else if (q.includes("leaflet") || q.includes("flyer")) {
    categorySlug = "leaflet-cover";
    categoryName = "Leaflet";
  } else if (q.includes("art card")) {
    categorySlug = "art-card";
    categoryName = "Art Card";
  }

  let finish: string | undefined;
  if (q.includes("spot uv") || q.includes("uv")) finish = "Spot UV Gloss";
  else if (q.includes("foil")) finish = "Metallic Gold Foil";
  else if (q.includes("velvet")) finish = "Velvet Soft-Touch";
  else if (q.includes("thermal matt") || q.includes("matt")) finish = "Thermal Matt";
  else if (q.includes("both side") || q.includes("front back")) finish = "Both Side (Front & Back)";
  else if (q.includes("single side")) finish = "Single Side";

  let size: string | undefined;
  if (norm.dimensions.length > 0) {
    size = `${norm.dimensions[0]} inch`;
  } else if (q.includes("a4")) {
    size = "A4 (8.27 × 11.69 in)";
  } else if (q.includes("a8")) {
    size = "A8 (2.05 × 2.91 in)";
  }

  const gsm = norm.gsmValues.length > 0 ? norm.gsmValues[0] : undefined;

  return {
    categorySlug,
    categoryName,
    productName: query.trim(),
    gsm,
    size,
    finish,
    quantity: norm.extractedQuantity,
  };
}

export type ProductSearchCandidate = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  shortDescription?: string | null;
  productCode?: string | null;
  category?: { name: string; slug: string } | null;
  listingSpecification?: string | null;
  productSize?: string | null;
  productionTime?: string | null;
  configuration?: Record<string, unknown> | null;
  orderable?: boolean;
  quoteable?: boolean;
};

/**
 * Evaluates and scores an individual product against normalized search tokens
 */
export function scoreProduct(
  product: ProductSearchCandidate,
  normalized: ReturnType<typeof normalizeQuery>
): ScoredProduct<ProductSearchCandidate> {
  const pName = product.name.toLowerCase();
  const pDesc = (product.description ?? "").toLowerCase();
  const pShort = (product.shortDescription ?? "").toLowerCase();
  const pCat = (product.category?.name ?? "").toLowerCase();
  const pCatSlug = (product.category?.slug ?? "").toLowerCase();
  const pCode = (product.productCode ?? "").toLowerCase();
  const pSpec = (product.listingSpecification ?? "").toLowerCase();
  const pSize = (product.productSize ?? "").toLowerCase();

  let score = 0;
  const matchReasons: string[] = [];

  const qRaw = normalized.normalized;

  // 1. Exact match on product name (+1000)
  if (pName === qRaw) {
    score += 1000;
    matchReasons.push("Exact product name match");
  }

  // 2. Exact phrase in product name (+500)
  else if (pName.includes(qRaw) && (qRaw.length >= 3 || qRaw === "uv")) {
    score += 500;
    matchReasons.push("Exact phrase in product title");
  }

  // 3. Category match (+250)
  if (pCat && (pCat.includes(qRaw) || qRaw.includes(pCat) || pCatSlug.includes(qRaw))) {
    score += 250;
    matchReasons.push(`Matches category: ${product.category?.name}`);
  }

  // 4. Check dimension match (+220)
  for (const dim of normalized.dimensions) {
    const cleanDim = dim.replace("x", " ");
    if (pName.includes(dim) || pDesc.includes(dim) || pSize.includes(dim) || pSize.includes(cleanDim) || pName.includes(cleanDim)) {
      score += 220;
      matchReasons.push(`Matches dimension: ${dim}`);
    }
  }

  // 5. Check GSM match (+220)
  for (const gsm of normalized.gsmValues) {
    const numGsm = gsm.replace(" GSM", "");
    if (pName.includes(gsm.toLowerCase()) || pName.includes(numGsm) || pDesc.includes(gsm.toLowerCase()) || pSpec.includes(numGsm)) {
      score += 220;
      matchReasons.push(`Matches paper weight: ${gsm}`);
    }
  }

  // 6. Token matching across product name, category, spec & description
  let nameTokensMatched = 0;
  for (const token of normalized.tokens) {
    const inName = pName.includes(token);
    const inCat = pCat.includes(token);
    const inSpec = pSpec.includes(token);
    const inDesc = pDesc.includes(token) || pShort.includes(token);

    if (inName) {
      score += 90;
      nameTokensMatched++;
    } else if (inCat) {
      score += 60;
    } else if (inSpec) {
      score += 50;
    } else if (inDesc) {
      score += 35;
    } else {
      // Fuzzy typo check against name words
      const nameWords = pName.split(/\s+/);
      const isFuzzy = nameWords.some((w) => isFuzzyMatch(w, token));
      if (isFuzzy) {
        score += 75;
        matchReasons.push(`Similar term for "${token}"`);
      }
    }
  }

  // All tokens matched in product name (+300 bonus)
  if (normalized.tokens.length > 1 && nameTokensMatched === normalized.tokens.length) {
    score += 300;
    matchReasons.push("All search terms present in product title");
  }

  return {
    item: product,
    score,
    matchReasons: Array.from(new Set(matchReasons)),
  };
}

/**
 * Searches and ranks products with confidence thresholding
 */
export function rankProducts<T extends ProductSearchCandidate>(
  products: T[],
  query: string
): SearchEngineResult<T> {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      query: "",
      normalizedQuery: "",
      confidence: "HIGH",
      matchReason: "",
      results: products,
      total: products.length,
      fallbackQuoteAvailable: false,
      extractedRequirement: {},
    };
  }

  const normalized = normalizeQuery(trimmed);
  const scored = products
    .map((p) => scoreProduct(p, normalized))
    .filter((sp) => sp.score > 0)
    .sort((a, b) => b.score - a.score);

  const bestScore = scored[0]?.score ?? 0;
  let confidence: SearchConfidence = "NONE";
  let matchReason = "";

  if (bestScore >= 200) {
    confidence = "HIGH";
    matchReason = scored[0]?.matchReasons[0] || "High-relevance match";
  } else if (bestScore >= 70) {
    confidence = "PARTIAL";
    matchReason = "Closest matching catalogue products";
  } else {
    confidence = "NONE";
    matchReason = "No matching catalogue product found";
  }

  // Filter results according to confidence threshold:
  // - HIGH: only items with score >= 100
  // - PARTIAL: closest items with score >= 70
  // - NONE: 0 items (never show fake unrelated products!)
  const filtered =
    confidence === "HIGH"
      ? scored.filter((s) => s.score >= 100).map((s) => s.item as T)
      : confidence === "PARTIAL"
      ? scored.filter((s) => s.score >= 70).slice(0, 6).map((s) => s.item as T)
      : [];

  return {
    query: trimmed,
    normalizedQuery: normalized.normalized,
    confidence,
    matchReason,
    results: filtered,
    total: filtered.length,
    fallbackQuoteAvailable: true,
    extractedRequirement: extractRequirement(trimmed),
  };
}
