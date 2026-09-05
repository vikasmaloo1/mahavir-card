import { indiaStateName } from "@/lib/india-states";

export type TaxJurisdiction = "INTRA_STATE" | "INTER_STATE";

export type TaxCalculationInput = {
  taxableSubtotal: number;
  taxRate?: number; // default 18.000 (%)
  stateCode?: string | null; // "GJ", "RJ", etc.
  taxInclusive?: boolean;
};

export type TaxCalculationResult = {
  taxableSubtotal: string;
  taxAmount: string;
  cgstRate: number;
  cgstAmount: string;
  sgstRate: number;
  sgstAmount: string;
  igstRate: number;
  igstAmount: string;
  taxType: TaxJurisdiction;
  taxRate: string;
  customerState: "GJ" | "RJ";
  stateName: string;
  unroundedTotal: string;
  roundOff: string;
  grandTotal: string;
};

/**
 * Standard rounding to 2 decimal places for financial calculations
 */
export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function formatMoneyString(amount: number): string {
  return roundMoney(amount).toFixed(2);
}

/**
 * Commercial Paisa Adjustment / Round-Off:
 * - If under 50 paisa (< 0.50): round down to lower whole number (floor)
 * - If 50 paisa or above (>= 0.50): round up to next whole number (ceil)
 * E.g.
 *   124.38 -> 124.00 (round-off: -0.38)
 *   124.50 -> 125.00 (round-off: +0.50)
 *   124.65 -> 125.00 (round-off: +0.35)
 *   124.00 -> 124.00 (round-off: 0.00)
 */
export function roundPaisaAdjustment(amount: number): {
  roundedAmount: number;
  roundOff: number;
  roundOffString: string;
  grandTotalString: string;
} {
  const safe = Number.isFinite(amount) ? amount : 0;
  const roundedAmount = Math.round(safe);
  const roundOff = roundMoney(roundedAmount - safe);
  const roundOffString = roundOff >= 0 ? `+${roundOff.toFixed(2)}` : roundOff.toFixed(2);
  const grandTotalString = roundedAmount.toFixed(2);
  return { roundedAmount, roundOff, roundOffString, grandTotalString };
}

/**
 * Resolves the state code to an allowed commerce state (defaulting to GJ)
 */
export function resolveCommerceState(stateCode?: string | null): "GJ" | "RJ" {
  if (!stateCode) return "GJ";
  const normalized = stateCode.trim().toUpperCase();
  if (normalized === "RJ" || normalized === "RAJASTHAN") return "RJ";
  return "GJ";
}

/**
 * Central tax calculation service for Mahavir Card.
 * Rules:
 * - Gujarat (GJ) -> Intra-state: CGST (taxRate/2)% + SGST (taxRate/2)%, IGST = 0
 * - Rajasthan (RJ) -> Inter-state: IGST (taxRate)%, CGST = 0, SGST = 0
 * - If taxableSubtotal <= 0 -> all tax components = 0.00
 * - Grand total applies commercial round-off:
 *   fractional paisa < 0.50 rounds down to lower whole rupee;
 *   fractional paisa >= 0.50 rounds up to next whole rupee.
 */
export function calculateTax({
  taxableSubtotal,
  taxRate = 18,
  stateCode,
  taxInclusive = false,
}: TaxCalculationInput): TaxCalculationResult {
  const safeSubtotal = Number.isFinite(taxableSubtotal) && taxableSubtotal > 0 ? taxableSubtotal : 0;
  const safeRate = Number.isFinite(taxRate) && taxRate >= 0 ? taxRate : 18;
  const customerState = resolveCommerceState(stateCode);
  const stateName = indiaStateName(customerState) ?? "Gujarat";

  if (safeSubtotal === 0) {
    return {
      taxableSubtotal: "0.00",
      taxAmount: "0.00",
      cgstRate: customerState === "GJ" ? safeRate / 2 : 0,
      cgstAmount: "0.00",
      sgstRate: customerState === "GJ" ? safeRate / 2 : 0,
      sgstAmount: "0.00",
      igstRate: customerState === "RJ" ? safeRate : 0,
      igstAmount: "0.00",
      taxType: customerState === "GJ" ? "INTRA_STATE" : "INTER_STATE",
      taxRate: safeRate.toFixed(3),
      customerState,
      stateName,
      unroundedTotal: "0.00",
      roundOff: "0.00",
      grandTotal: "0.00",
    };
  }

  if (safeRate === 0) {
    // No tax to add, but the priced amount itself is still owed — e.g. B2B pricing with no GST.
    const netAmount = roundMoney(safeSubtotal);
    const { roundOffString, grandTotalString } = roundPaisaAdjustment(netAmount);
    return {
      taxableSubtotal: formatMoneyString(netAmount),
      taxAmount: "0.00",
      cgstRate: customerState === "GJ" ? 0 : 0,
      cgstAmount: "0.00",
      sgstRate: customerState === "GJ" ? 0 : 0,
      sgstAmount: "0.00",
      igstRate: 0,
      igstAmount: "0.00",
      taxType: customerState === "GJ" ? "INTRA_STATE" : "INTER_STATE",
      taxRate: "0.000",
      customerState,
      stateName,
      unroundedTotal: formatMoneyString(netAmount),
      roundOff: roundOffString,
      grandTotal: grandTotalString,
    };
  }

  let netAmount: number;
  let taxTotal: number;

  if (taxInclusive) {
    netAmount = roundMoney(safeSubtotal / (1 + safeRate / 100));
    taxTotal = roundMoney(safeSubtotal - netAmount);
  } else {
    netAmount = roundMoney(safeSubtotal);
    taxTotal = roundMoney((netAmount * safeRate) / 100);
  }

  const isIntraState = customerState === "GJ";
  const taxType: TaxJurisdiction = isIntraState ? "INTRA_STATE" : "INTER_STATE";

  let cgstRate = 0;
  let cgstAmount = 0;
  let sgstRate = 0;
  let sgstAmount = 0;
  let igstRate = 0;
  let igstAmount = 0;

  if (isIntraState) {
    cgstRate = safeRate / 2;
    sgstRate = safeRate / 2;
    // Split tax evenly
    cgstAmount = roundMoney((netAmount * cgstRate) / 100);
    sgstAmount = roundMoney((netAmount * sgstRate) / 100);
    taxTotal = roundMoney(cgstAmount + sgstAmount);
  } else {
    igstRate = safeRate;
    igstAmount = taxTotal;
  }

  const rawTotal = roundMoney(netAmount + taxTotal);
  const { roundOffString, grandTotalString } = roundPaisaAdjustment(rawTotal);

  return {
    taxableSubtotal: formatMoneyString(netAmount),
    taxAmount: formatMoneyString(taxTotal),
    cgstRate,
    cgstAmount: formatMoneyString(cgstAmount),
    sgstRate,
    sgstAmount: formatMoneyString(sgstAmount),
    igstRate,
    igstAmount: formatMoneyString(igstAmount),
    taxType,
    taxRate: safeRate.toFixed(3),
    customerState,
    stateName,
    unroundedTotal: formatMoneyString(rawTotal),
    roundOff: roundOffString,
    grandTotal: grandTotalString,
  };
}
