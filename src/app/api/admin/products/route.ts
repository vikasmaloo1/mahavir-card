import { desc, ilike, or } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { products } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { productSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try { await requireRole(request, ["ADMIN"]); const params = new URL(request.url).searchParams; const page = Math.max(1, Number(params.get("page") ?? 1)); const limit = Math.min(100, Math.max(1, Number(params.get("limit") ?? 25))); const query = params.get("q")?.trim(); const where = query ? or(ilike(products.name, `%${query}%`), ilike(products.slug, `%${query}%`)) : undefined; const data = await db.select().from(products).where(where).orderBy(desc(products.createdAt)).limit(limit).offset((page - 1) * limit); return jsonOk({ items: data, page, limit }); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}

export async function POST(request: Request) {
  try { await requireRole(request, ["ADMIN"]); const input = await readBody(request, productSchema); const [product] = await db.insert(products).values(input).returning(); return product ? jsonOk(product, 201) : jsonError("Product was not created", 500); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
