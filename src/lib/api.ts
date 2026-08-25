import { ZodError, type ZodType } from "zod";

export function jsonOk<T>(data: T, status = 200) {
  return Response.json({ data }, { status });
}

export function jsonError(message: string, status = 400, details?: unknown) {
  return Response.json(
    { error: { message, ...(details ? { details } : {}) } },
    { status },
  );
}

export async function readBody<T>(request: Request, schema: ZodType<T>) {
  const body = await request.json().catch(() => null);
  const result = schema.safeParse(body);

  if (!result.success) {
    throw new ZodError(result.error.issues);
  }

  return result.data;
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return jsonError("Validation failed", 422, error.flatten().fieldErrors);
  }

  console.error(error);
  return jsonError("Something went wrong", 500);
}
