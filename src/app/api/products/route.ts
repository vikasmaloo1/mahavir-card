import { asc, eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { products } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { productSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const search = new URL(request.url).searchParams.get("q")?.trim();
    const data = await db.select().from(products).where(eq(products.isActive, true)).orderBy(asc(products.name));
    const filtered = search ? data.filter((product) => product.name.toLowerCase().includes(search.toLowerCase())) : data;
    return jsonOk(filtered);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const input = await readBody(request, productSchema);
    const [product] = await db.insert(products).values(input).returning();
    return product ? jsonOk(product, 201) : jsonError("Product was not created", 500);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleApiError(error);
  }
}
