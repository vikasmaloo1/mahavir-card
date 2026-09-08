export type CreditCustomer = {
  customerType: string;
  creditEnabled: boolean;
  availableCredit: string | number;
  status: string;
};

export type CreditEligibility =
  | { eligible: true; availableCredit: number }
  | { eligible: false; availableCredit: number; reason: "B2B_ONLY" | "INACTIVE" | "DISABLED" | "INVALID_TOTAL" | "INSUFFICIENT"; message: string };

export function evaluateCreditEligibility(customer: CreditCustomer, orderTotal: string | number): CreditEligibility {
  const availableCredit = Number(customer.availableCredit);
  const total = Number(orderTotal);
  if (customer.status !== "ACTIVE") return { eligible: false, availableCredit, reason: "INACTIVE", message: "This customer account is not active." };
  if (!Number.isFinite(total) || total <= 0) return { eligible: false, availableCredit, reason: "INVALID_TOTAL", message: "The order total is invalid." };

  if (customer.customerType === "B2C") {
    // B2C customers pay with prepaid wallet balance: strictly no credit and no negative balance allowed
    if (availableCredit < total) {
      return {
        eligible: false,
        availableCredit,
        reason: "INSUFFICIENT",
        message: `Insufficient wallet balance (₹${availableCredit.toFixed(2)}). Order total is ₹${total.toFixed(2)}. Please top up your wallet or choose another payment method.`,
      };
    }
    return { eligible: true, availableCredit };
  }

  if (customer.customerType === "B2B") {
    if (!customer.creditEnabled) return { eligible: false, availableCredit, reason: "DISABLED", message: "Credit ordering is not enabled for this account." };
    // B2B customers can place orders even at ₹0 or insufficient balance; balance is allowed to go negative
    return { eligible: true, availableCredit };
  }

  return { eligible: false, availableCredit, reason: "B2B_ONLY", message: "Wallet / credit ordering is not available for this account type." };
}
