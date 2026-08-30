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
  if (customer.customerType !== "B2B") return { eligible: false, availableCredit, reason: "B2B_ONLY", message: "Credit orders are available only to B2B customers." };
  if (customer.status !== "ACTIVE") return { eligible: false, availableCredit, reason: "INACTIVE", message: "This customer account is not active." };
  if (!customer.creditEnabled) return { eligible: false, availableCredit, reason: "DISABLED", message: "Credit ordering is not enabled for this account." };
  if (!Number.isFinite(total) || total <= 0) return { eligible: false, availableCredit, reason: "INVALID_TOTAL", message: "The order total is invalid." };
  if (!Number.isFinite(availableCredit) || availableCredit < total) return { eligible: false, availableCredit, reason: "INSUFFICIENT", message: "Available credit is lower than the order total." };
  return { eligible: true, availableCredit };
}
