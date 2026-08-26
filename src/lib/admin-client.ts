export class AdminApiError extends Error {
  status: number;
  details: Record<string, string[] | undefined>;

  constructor(message: string, status: number, details: Record<string, string[] | undefined> = {}) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.details = details;
  }
}

type ApiPayload<T> = {
  success: boolean;
  data?: T;
  error?: { message?: string; details?: Record<string, string[] | undefined> };
};

export async function adminRequest<T>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(path, { ...init, headers, cache: "no-store" });
  const payload = await response.json().catch(() => null) as ApiPayload<T> | null;

  if (!response.ok || !payload?.success || payload.data === undefined) {
    throw new AdminApiError(payload?.error?.message ?? "The request could not be completed", response.status, payload?.error?.details ?? {});
  }

  return payload.data;
}

export function asItems<T>(value: T[] | { items?: T[] }) {
  return Array.isArray(value) ? value : value.items ?? [];
}

export function fieldError(error: unknown, field: string) {
  return error instanceof AdminApiError ? error.details[field]?.[0] : undefined;
}

export function formattedDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return "-";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

export function formattedAmount(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `Rs ${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "-";
}
