import { asc, eq } from "drizzle-orm";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { billItemTypes } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const types = await db
      .select()
      .from(billItemTypes)
      .where(eq(billItemTypes.isActive, true))
      .orderBy(asc(billItemTypes.sortOrder), asc(billItemTypes.name));

    return jsonOk({ types });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const name = String(body.name ?? "").trim();
    if (!name) return jsonError("Item type name is required", 400);

    const hsnCode = String(body.hsnCode ?? "4909").trim() || "4909";
    const defaultRate = String(body.defaultRate ?? "0");
    const defaultPer = String(body.defaultPer ?? "PCS.").trim() || "PCS.";

    const [existing] = await db
      .select({ id: billItemTypes.id })
      .from(billItemTypes)
      .where(eq(billItemTypes.name, name))
      .limit(1);

    if (existing) {
      // If inactive, reactivate it with new values
      const [updated] = await db
        .update(billItemTypes)
        .set({
          hsnCode,
          defaultRate,
          defaultPer,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(billItemTypes.id, existing.id))
        .returning();
      return jsonOk({ type: updated, message: "Item type updated" });
    }

    const [newType] = await db
      .insert(billItemTypes)
      .values({
        name,
        hsnCode,
        defaultRate,
        defaultPer,
        isActive: true,
      })
      .returning();

    return jsonOk({ type: newType, message: "Item type created successfully" }, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleApiError(error);
  }
}
