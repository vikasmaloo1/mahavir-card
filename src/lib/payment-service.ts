import "server-only";

export type PaymentMethod = "RAZORPAY" | "COD" | "CREDIT";

export type PaymentIntent = {
  method: PaymentMethod;
  amount: string;
  status: "PENDING" | "COD_PENDING" | "CREDIT_APPROVED";
  provider: "RAZORPAY" | "COD" | "CUSTOMER_CREDIT";
};

export function createPaymentIntent(method: PaymentMethod, amount: string): PaymentIntent {
  if (method === "RAZORPAY") return { method, amount, status: "PENDING", provider: "RAZORPAY" };
  if (method === "COD") return { method, amount, status: "COD_PENDING", provider: "COD" };
  return { method, amount, status: "CREDIT_APPROVED", provider: "CUSTOMER_CREDIT" };
}
