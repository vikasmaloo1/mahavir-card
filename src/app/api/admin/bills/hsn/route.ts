import { asc, eq, sql } from "drizzle-orm";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { hsnMaster, billItemTypes } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";

// Self-healing: ensure table exists and default HSN codes (including 4820 & 4921) are present
async function ensureHsnMasterTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hsn_master (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" text NOT NULL UNIQUE,
        "description" text NOT NULL,
        "gstRate" numeric(6, 3) NOT NULL DEFAULT 18.000,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
        "updatedAt" timestamp with time zone NOT NULL DEFAULT now()
      );
    `);

    // Seed defaults if missing
    const defaults = [
      { code: "4909", description: "Card & Premium Card (Visiting cards, letterheads)", rate: "18.000", sort: 1 },
      { code: "4802", description: "Paper, Cover & Art Card Brochure", rate: "18.000", sort: 2 },
      { code: "4821", description: "Sticker & Labels", rate: "18.000", sort: 3 },
      { code: "4820", description: "Books (Registers, notebooks, diaries, order books, receipt books)", rate: "18.000", sort: 4 },
      { code: "4921", description: "Synthetic Covers", rate: "18.000", sort: 5 },
    ];

    for (const item of defaults) {
      await db.execute(sql`
        INSERT INTO hsn_master ("code", "description", "gstRate", "sortOrder", "isActive")
        VALUES (${item.code}, ${item.description}, ${item.rate}, ${item.sort}, true)
        ON CONFLICT ("code") DO NOTHING;
      `);
    }

    // Also ensure preset bill item types include Books and Synthetic Covers
    const presetItemTypes = [
      { name: "Books", hsn: "4820", per: "PCS.", sort: 9 },
      { name: "Synthetic Covers", hsn: "4921", per: "PCS.", sort: 10 },
    ];
    for (const pt of presetItemTypes) {
      await db.execute(sql`
        INSERT INTO bill_item_types ("name", "hsnCode", "defaultPer", "sortOrder", "isActive")
        VALUES (${pt.name}, ${pt.hsn}, ${pt.per}, ${pt.sort}, true)
        ON CONFLICT ("name") DO NOTHING;
      `);
    }
  } catch (err) {
    console.error("Failed to ensure hsn_master table:", err);
  }
}

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    await ensureHsnMasterTable();

    const hsnList = await db
      .select()
      .from(hsnMaster)
      .where(eq(hsnMaster.isActive, true))
      .orderBy(asc(hsnMaster.sortOrder), asc(hsnMaster.code));

    return jsonOk({ hsnList });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    await ensureHsnMasterTable();

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const code = String(body.code ?? "").trim();
    if (!code) return jsonError("HSN code is required", 400);

    const description = String(body.description ?? "").trim();
    if (!description) return jsonError("HSN description/category is required", 400);

    const gstRate = String(body.gstRate ?? "18.000").trim() || "18.000";
    const sortOrder = Number(body.sortOrder ?? 10);

    const [existing] = await db
      .select({ id: hsnMaster.id })
      .from(hsnMaster)
      .where(eq(hsnMaster.code, code))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(hsnMaster)
        .set({
          description,
          gstRate,
          sortOrder,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(hsnMaster.id, existing.id))
        .returning();

      return jsonOk({ hsn: updated, message: `HSN code ${code} updated successfully` });
    }

    const [newHsn] = await db
      .insert(hsnMaster)
      .values({
        code,
        description,
        gstRate,
        sortOrder,
        isActive: true,
      })
      .returning();

    return jsonOk({ hsn: newHsn, message: `HSN code ${code} added successfully` }, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleApiError(error);
  }
}