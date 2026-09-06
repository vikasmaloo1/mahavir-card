import { eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { artworks, customers, orders } from "@/lib/db/schema";
import { emitNotification } from "@/lib/notifications/emit";
import { requireRole } from "@/lib/permissions";
import { artworkUpdateSchema } from "@/lib/validation";

export async function GET(request: Request, ctx: RouteContext<"/api/admin/artworks/[id]">) {
  try { await requireRole(request, ["ADMIN"]); const { id } = await ctx.params; const [artwork] = await db.select().from(artworks).where(eq(artworks.id, id)).limit(1); return artwork ? jsonOk(artwork) : jsonError("Artwork not found", 404); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/artworks/[id]">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const input = await readBody(request, artworkUpdateSchema);
    const [existing] = await db.select({ status: artworks.status, customerId: artworks.customerId, orderId: artworks.orderId, fileName: artworks.fileName }).from(artworks).where(eq(artworks.id, id)).limit(1);
    const [artwork] = await db.update(artworks).set({ ...input, updatedAt: new Date() }).where(eq(artworks.id, id)).returning();
    if (!artwork) return jsonError("Artwork not found", 404);
    if (input.status && input.status !== existing?.status && (input.status === "REJECTED" || input.status === "CHANGES_REQUIRED") && artwork.customerId) {
      const [customer] = await db.select({ email: customers.email, contactName: customers.contactName }).from(customers).where(eq(customers.id, artwork.customerId)).limit(1);
      const [order] = artwork.orderId ? await db.select({ orderNumber: orders.orderNumber }).from(orders).where(eq(orders.id, artwork.orderId)).limit(1) : [];
      await emitNotification({
        customerId: artwork.customerId,
        event: "ARTWORK_REJECTED",
        relatedEntityType: "artwork",
        relatedEntityId: artwork.id,
        recipientEmail: customer?.email ?? null,
        context: { customerName: customer?.contactName, orderNumber: order?.orderNumber, status: input.notes ?? input.status },
      });
    }
    return jsonOk(artwork);
  } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
