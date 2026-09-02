/**
 * A plain UPI VPA (not a payment gateway) — no per-transaction fee, but also
 * no webhook: the customer's UPI app pays the business directly, and the
 * business/admin has to confirm the payment manually (see the UTR-reference
 * submission flow in checkout-flow.tsx / wallet-dashboard.tsx and the
 * existing admin payments/wallet approval screens). Not a secret — this is
 * the same VPA already printed on the shop's public GPay QR code.
 */
export const UPI_VPA = process.env.UPI_VPA || "mahavircard2011-2@oksbi";
export const UPI_PAYEE_NAME = process.env.UPI_PAYEE_NAME || "Mahavir Card";

export function buildUpiUri({ amount, note }: { amount: string; note: string }) {
  const params = new URLSearchParams({
    pa: UPI_VPA,
    pn: UPI_PAYEE_NAME,
    am: amount,
    cu: "INR",
    tn: note.slice(0, 50),
  });
  return `upi://pay?${params.toString()}`;
}
