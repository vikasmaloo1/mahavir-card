import "server-only";

export type PaymentMethod = "RAZORPAY" | "COD";

export type PaymentIntent = {
  method: PaymentMethod;
  amount: string;
  status: "PENDING" | "COD_PENDING";
  provider: "RAZORPAY" | "COD";
};

export function createPaymentIntent(method: PaymentMethod, amount: string): PaymentIntent {
  if (method === "RAZORPAY") return { method, amount, status: "PENDING", provider: "RAZORPAY" };
  return { method, amount, status: "COD_PENDING", provider: "COD" };
}
