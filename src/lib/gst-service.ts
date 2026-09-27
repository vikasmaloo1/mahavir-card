import { db } from "@/lib/db/server";
import { customers, bills, purchases } from "@/lib/db/schema";
import { ilike } from "drizzle-orm";

/**
 * Mapping of 2-digit Indian GST State TIN Codes to State Name & 2-letter Code.
 * Covers all 28 states, 8 union territories, and special territories according to GSTN.
 */
export const GST_STATE_MAP: Record<string, { code: string; name: string }> = {
  "01": { code: "JK", name: "Jammu and Kashmir" },
  "02": { code: "HP", name: "Himachal Pradesh" },
  "03": { code: "PB", name: "Punjab" },
  "04": { code: "CH", name: "Chandigarh" },
  "05": { code: "UK", name: "Uttarakhand" },
  "06": { code: "HR", name: "Haryana" },
  "07": { code: "DL", name: "Delhi" },
  "08": { code: "RJ", name: "Rajasthan" },
  "09": { code: "UP", name: "Uttar Pradesh" },
  "10": { code: "BR", name: "Bihar" },
  "11": { code: "SK", name: "Sikkim" },
  "12": { code: "AR", name: "Arunachal Pradesh" },
  "13": { code: "NL", name: "Nagaland" },
  "14": { code: "MN", name: "Manipur" },
  "15": { code: "MZ", name: "Mizoram" },
  "16": { code: "TR", name: "Tripura" },
  "17": { code: "ML", name: "Meghalaya" },
  "18": { code: "AS", name: "Assam" },
  "19": { code: "WB", name: "West Bengal" },
  "20": { code: "JH", name: "Jharkhand" },
  "21": { code: "OR", name: "Odisha" },
  "22": { code: "CG", name: "Chhattisgarh" },
  "23": { code: "MP", name: "Madhya Pradesh" },
  "24": { code: "GJ", name: "Gujarat" },
  "25": { code: "DN", name: "Daman and Diu" },
  "26": { code: "DN", name: "Dadra and Nagar Haveli and Daman and Diu" },
  "27": { code: "MH", name: "Maharashtra" },
  "28": { code: "AP", name: "Andhra Pradesh" },
  "29": { code: "KA", name: "Karnataka" },
  "30": { code: "GA", name: "Goa" },
  "31": { code: "LD", name: "Lakshadweep" },
  "32": { code: "KL", name: "Kerala" },
  "33": { code: "TN", name: "Tamil Nadu" },
  "34": { code: "PY", name: "Puducherry" },
  "35": { code: "AN", name: "Andaman and Nicobar Islands" },
  "36": { code: "TS", name: "Telangana" },
  "37": { code: "AP", name: "Andhra Pradesh" },
  "38": { code: "LA", name: "Ladakh" },
  "97": { code: "OT", name: "Other Territory" },
};

const GST_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Computes check digit for 14-char GSTIN prefix using official GSTN Luhn Modulo 36 algorithm.
 */
export function calculateGstCheckDigit(gstin14: string): string {
  if (!gstin14 || gstin14.length !== 14) return "";
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const val = GST_CHARS.indexOf(gstin14[i]);
    if (val === -1) return "";
    const factor = i % 2 === 0 ? 1 : 2;
    const prod = val * factor;
    sum += Math.floor(prod / 36) + (prod % 36);
  }
  const checkCode = (36 - (sum % 36)) % 36;
  return GST_CHARS[checkCode];
}

export interface GstValidationResult {
  valid: boolean;
  error?: string;
  gstin: string;
  tin?: string;
  stateName?: string;
  stateCode?: string;
  pan?: string;
  entityType?: string;
  isGujarat?: boolean;
}

/**
 * Validates 15-character GSTIN format, valid state TIN, and official Modulo 36 checksum digit.
 */
export function validateGstFormat(rawGstin: string): GstValidationResult {
  const gstin = (rawGstin || "").trim().toUpperCase();
  if (!gstin) {
    return { valid: false, error: "GST number cannot be empty.", gstin: "" };
  }

  if (gstin.length !== 15) {
    return {
      valid: false,
      error: `GST number must be exactly 15 characters (currently ${gstin.length}).`,
      gstin,
    };
  }

  // Regex standard: 2 numeric digits + 5 alpha + 4 numeric + 1 alpha + 1 alpha/numeric + 'Z' + 1 alpha/numeric
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstRegex.test(gstin)) {
    return {
      valid: false,
      error: "Invalid GST number format. Expected format: 22AAAAA0000A1Z5 (2 digits state code + 10-char PAN + 1 entity # + 'Z' + 1 check character).",
      gstin,
    };
  }

  const tin = gstin.slice(0, 2);
  const stateInfo = GST_STATE_MAP[tin];
  if (!stateInfo) {
    return {
      valid: false,
      error: `Invalid state code '${tin}'. Indian GST state codes must be between 01 and 38.`,
      gstin,
    };
  }

  const expectedCheckDigit = calculateGstCheckDigit(gstin.slice(0, 14));
  const actualCheckDigit = gstin[14];
  if (expectedCheckDigit && expectedCheckDigit !== actualCheckDigit) {
    return {
      valid: false,
      error: `Invalid GST number: Checksum verification failed. Expected '${expectedCheckDigit}' at the end, but found '${actualCheckDigit}'. Please check for typos.`,
      gstin,
    };
  }

  const pan = gstin.slice(2, 12);
  const panTypeChar = pan[3];
  const PAN_TYPES: Record<string, string> = {
    P: "Proprietorship / Individual",
    C: "Company (Pvt Ltd / Public Ltd)",
    F: "Partnership Firm / LLP",
    H: "Hindu Undivided Family (HUF)",
    A: "Association of Persons (AOP)",
    T: "Trust",
    B: "Body of Individuals",
    L: "Local Authority",
    J: "Artificial Juridical Person",
    G: "Government Entity",
  };
  const entityType = PAN_TYPES[panTypeChar] || "Registered Taxpayer";

  return {
    valid: true,
    gstin,
    tin,
    stateName: stateInfo.name,
    stateCode: stateInfo.code,
    pan,
    entityType,
    isGujarat: tin === "24",
  };
}

export interface GstLookupResult {
  valid: boolean;
  error?: string;
  gstin: string;
  tradeName?: string;
  legalName?: string;
  status?: string; // "Active", "Cancelled", "Suspended"
  statusAlert?: string;
  state: string;
  stateCode: string;
  tin: string;
  pan: string;
  entityType: string;
  isGujarat: boolean;
  suggestedTaxType: "INTRA_STATE" | "INTER_STATE";
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  source: "GSTINCHECK_API" | "APPYFLOW_API" | "DATABASE_CACHE" | "OFFLINE_VERIFIED";
  apiKeyConfigured: boolean;
  message?: string;
}

/**
 * Searches local database for matching GST number to reuse already saved business data
 * without consuming external API credits.
 */
async function lookupLocalDatabase(gstin: string): Promise<Partial<GstLookupResult> | null> {
  try {
    // 1. Check customers table
    const [cust] = await db
      .select({
        companyName: customers.companyName,
        contactName: customers.contactName,
        city: customers.city,
        state: customers.state,
        stateCode: customers.stateCode,
      })
      .from(customers)
      .where(ilike(customers.gstNumber, gstin))
      .limit(1);

    if (cust && (cust.companyName || cust.contactName)) {
      return {
        tradeName: cust.companyName || undefined,
        legalName: cust.contactName || cust.companyName || undefined,
        city: cust.city || undefined,
        state: cust.state || undefined,
        stateCode: cust.stateCode || undefined,
      };
    }

    // 2. Check bills table
    const [bill] = await db
      .select({
        customerName: bills.customerName,
        companyName: bills.companyName,
        addressLine1: bills.addressLine1,
        addressLine2: bills.addressLine2,
        city: bills.city,
        state: bills.state,
        stateCode: bills.stateCode,
        postalCode: bills.postalCode,
      })
      .from(bills)
      .where(ilike(bills.gstin, gstin))
      .limit(1);

    if (bill && (bill.companyName || bill.customerName)) {
      return {
        tradeName: bill.companyName || undefined,
        legalName: bill.customerName || undefined,
        addressLine1: bill.addressLine1 || undefined,
        addressLine2: bill.addressLine2 || undefined,
        city: bill.city || undefined,
        state: bill.state || undefined,
        stateCode: bill.stateCode || undefined,
        postalCode: bill.postalCode || undefined,
      };
    }

    // 3. Check purchases table
    const [purch] = await db
      .select({
        partyName: purchases.partyName,
      })
      .from(purchases)
      .where(ilike(purchases.partyGstin, gstin))
      .limit(1);

    if (purch && purch.partyName) {
      return {
        tradeName: purch.partyName,
        legalName: purch.partyName,
      };
    }
  } catch (err) {
    console.warn("GST local DB lookup notice:", err);
  }
  return null;
}

/**
 * Calls gstincheck.co.in API (Free tier available with API key).
 */
async function lookupGstinCheckApi(
  gstin: string,
  apiKey: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const url = `https://sheet.gstincheck.co.in/check/${apiKey.trim()}/${gstin.trim()}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return { success: false, error: `GST API responded with status ${res.status}` };
    }

    const json = await res.json();
    if (json.flag === false) {
      return {
        success: false,
        error: json.message || "GSTIN not found or invalid on GST portal.",
      };
    }

    return { success: true, data: json.data || json };
  } catch (err: any) {
    return {
      success: false,
      error: err.name === "TimeoutError" ? "GST API request timed out." : err.message || "Failed to reach GST API.",
    };
  }
}

/**
 * Calls appyflow.in API (Alternative provider).
 */
async function lookupAppyflowApi(
  gstin: string,
  secretKey: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch("https://appyflow.in/api/verifyGST", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gstNo: gstin, key_secret: secretKey }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return { success: false, error: `Appyflow API returned status ${res.status}` };
    }

    const json = await res.json();
    if (json.error) {
      return { success: false, error: json.message || "Invalid GSTIN or key error." };
    }

    return { success: true, data: json.taxpayerInfo || json };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Appyflow request failed",
    };
  }
}

/**
 * Full GST Lookup Handler:
 * 1. Validates 15-char format, valid state TIN, and official Modulo-36 checksum.
 * 2. Checks local DB cache.
 * 3. If external API key is configured (GSTINCHECK_API_KEY / GST_API_KEY / APPYFLOW_KEY_SECRET),
 *    queries live taxpayer details, legal/trade name, status, and full registered address.
 * 4. Returns unified GstLookupResult.
 */
export async function lookupGstin(rawGstin: string): Promise<GstLookupResult> {
  const validation = validateGstFormat(rawGstin);
  if (!validation.valid) {
    return {
      valid: false,
      error: validation.error || "Invalid GST number.",
      gstin: (rawGstin || "").trim().toUpperCase(),
      state: "",
      stateCode: "",
      tin: "",
      pan: "",
      entityType: "",
      isGujarat: false,
      suggestedTaxType: "INTRA_STATE",
      source: "OFFLINE_VERIFIED",
      apiKeyConfigured: Boolean(
        process.env.GSTINCHECK_API_KEY || process.env.GST_API_KEY || process.env.APPYFLOW_KEY_SECRET
      ),
    };
  }

  const { gstin, tin = "", stateName = "", stateCode = "", pan = "", entityType = "", isGujarat = false } = validation;
  const suggestedTaxType: "INTRA_STATE" | "INTER_STATE" = isGujarat ? "INTRA_STATE" : "INTER_STATE";

  // Check DB cache first
  const dbData = await lookupLocalDatabase(gstin);

  // Check external API keys
  const gstinCheckKey = process.env.GSTINCHECK_API_KEY || process.env.GST_API_KEY;
  const appyflowKey = process.env.APPYFLOW_KEY_SECRET;
  const hasApiKey = Boolean(gstinCheckKey || appyflowKey);

  if (gstinCheckKey) {
    const apiResult = await lookupGstinCheckApi(gstin, gstinCheckKey);
    if (!apiResult.success) {
      // If API gave explicit "invalid/not found" error, report it
      if (apiResult.error?.toLowerCase().includes("not found") || apiResult.error?.toLowerCase().includes("invalid")) {
        return {
          valid: false,
          error: `GST Portal verification: ${apiResult.error}`,
          gstin,
          state: stateName,
          stateCode,
          tin,
          pan,
          entityType,
          isGujarat,
          suggestedTaxType,
          source: "GSTINCHECK_API",
          apiKeyConfigured: true,
        };
      }
      // If network/rate limit error, fallback to DB cache or offline format
      console.warn("GST API call failed, falling back to cache/offline:", apiResult.error);
    } else if (apiResult.data) {
      const d = apiResult.data;
      const addr = d.pradr?.addr || {};

      const addressParts1 = [addr.bno, addr.flno, addr.bnm, addr.st].filter(Boolean).map((s: string) => s.trim());
      const addressParts2 = [addr.loc, addr.dst].filter(Boolean).map((s: string) => s.trim());

      const status = d.sts || "Active";
      const statusAlert =
        status.toLowerCase() !== "active"
          ? `WARNING: GST status is "${status}" on GST portal!`
          : undefined;

      return {
        valid: true,
        gstin,
        tradeName: d.tradeNam || d.lgnm || dbData?.tradeName,
        legalName: d.lgnm || d.tradeNam || dbData?.legalName,
        status,
        statusAlert,
        state: addr.stcd || stateName,
        stateCode: stateCode,
        tin,
        pan,
        entityType: d.ctb || entityType,
        isGujarat,
        suggestedTaxType,
        addressLine1: addressParts1.join(", ") || dbData?.addressLine1,
        addressLine2: addressParts2.join(", ") || dbData?.addressLine2,
        city: addr.city || addr.dst || dbData?.city,
        postalCode: addr.pncd || dbData?.postalCode,
        source: "GSTINCHECK_API",
        apiKeyConfigured: true,
      };
    }
  } else if (appyflowKey) {
    const apiResult = await lookupAppyflowApi(gstin, appyflowKey);
    if (apiResult.success && apiResult.data) {
      const d = apiResult.data;
      const addr = d.pradr?.addr || {};
      const status = d.sts || "Active";

      return {
        valid: true,
        gstin,
        tradeName: d.tradeNam || d.lgnm || dbData?.tradeName,
        legalName: d.lgnm || d.tradeNam || dbData?.legalName,
        status,
        statusAlert: status.toLowerCase() !== "active" ? `WARNING: GST status is "${status}"!` : undefined,
        state: addr.stcd || stateName,
        stateCode,
        tin,
        pan,
        entityType: d.ctb || entityType,
        isGujarat,
        suggestedTaxType,
        addressLine1: [addr.bno, addr.flno, addr.bnm, addr.st].filter(Boolean).join(", ") || dbData?.addressLine1,
        addressLine2: [addr.loc, addr.dst].filter(Boolean).join(", ") || dbData?.addressLine2,
        city: addr.city || addr.dst || dbData?.city,
        postalCode: addr.pncd || dbData?.postalCode,
        source: "APPYFLOW_API",
        apiKeyConfigured: true,
      };
    }
  }

  // If DB cache found
  if (dbData && (dbData.tradeName || dbData.legalName)) {
    return {
      valid: true,
      gstin,
      tradeName: dbData.tradeName,
      legalName: dbData.legalName,
      status: "Active",
      state: dbData.state || stateName,
      stateCode: dbData.stateCode || stateCode,
      tin,
      pan,
      entityType,
      isGujarat,
      suggestedTaxType,
      addressLine1: dbData.addressLine1,
      addressLine2: dbData.addressLine2,
      city: dbData.city,
      postalCode: dbData.postalCode,
      source: "DATABASE_CACHE",
      apiKeyConfigured: hasApiKey,
      message: "Details retrieved from previous saved records.",
    };
  }

  // Offline verified data (checksum and structure valid)
  return {
    valid: true,
    gstin,
    tradeName: undefined,
    legalName: undefined,
    status: "Active",
    state: stateName,
    stateCode,
    tin,
    pan,
    entityType,
    isGujarat,
    suggestedTaxType,
    source: "OFFLINE_VERIFIED",
    apiKeyConfigured: hasApiKey,
    message: hasApiKey
      ? "GST format and checksum verified."
      : "GST checksum & state verified! Add GSTINCHECK_API_KEY in .env to auto-fetch registered business name & address.",
  };
}
