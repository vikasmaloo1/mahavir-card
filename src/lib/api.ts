import { ZodError, type ZodType } from "zod";

export function jsonOk<T>(data: T, status = 200) {
  return Response.json({ success: true, data }, { status });
}

export function jsonError(message: string, status = 400, details?: unknown) {
  return Response.json(
    { success: false, error: { code: statusCode(status), message, ...(details ? { details } : {}) } },
    { status },
  );
}

function statusCode(status: number) {
  return status === 401 ? "UNAUTHORIZED" : status === 403 ? "FORBIDDEN" : status === 404 ? "NOT_FOUND" : status === 409 ? "CONFLICT" : status === 422 ? "VALIDATION_ERROR" : status >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR";
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
  if (error instanceof Response) {
    return error;
  }

  if (error instanceof ZodError) {
    return jsonError("Validation failed", 422, error.flatten().fieldErrors);
  }

  console.error(error);
  return jsonError("We couldn't complete this request right now. Please try again.", 500);
}
