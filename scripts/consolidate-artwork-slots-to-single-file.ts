import dotenv from "dotenv";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq } from "drizzle-orm";

import { artworkRequirements, artworkSlots, products } from "../src/lib/db/schema";

dotenv.config({ path: ".env.local" });
dotenv.config();

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.POSTGRES_URL_NON_POOLING ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("No database connection string configured");

const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const db = drizzle(pool);

/**
 * Per explicit user decision: artwork is always ONE CDR file, with multiple
 * sides/pages (front, back, foil separations, etc.) as pages inside that
 * single file — never separate upload slots. The Front-design/Back-design/etc
 * multi-slot data predates this session by 1.5+ weeks, so this is a genuine
 * catalog decision, not a revert of anything introduced recently.
 *
 * For every active requirement with more than one active slot: keep exactly
 * one slot (prefer slotKey "DESIGN", else lowest sortOrder), rename it to the
 * standard "Production artwork" / DESIGN slot, deactivate the rest (kept, not
 * deleted, so any artworks.artworkSlotId FK referencing them stays valid),
 * and record what the removed slots covered as pageInstructions so the
 * customer still knows what pages to include in the one file.
 */
async function main() {
  const reqs = await db.select().from(artworkRequirements).where(eq(artworkRequirements.isActive, true));

  let changedCount = 0;
  for (const req of reqs) {
    const slots = (await db.select().from(artworkSlots).where(and(eq(artworkSlots.artworkRequirementId, req.id), eq(artworkSlots.isActive, true))))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    if (slots.length <= 1) continue;

    const keep = slots.find((s) => s.slotKey === "DESIGN") ?? slots[0];
    const drop = slots.filter((s) => s.id !== keep.id);

    const [product] = await db.select({ name: products.name }).from(products).where(eq(products.id, req.productId));

    const pages = slots
      .filter((s) => s.slotKey !== "DESIGN")
      .map((s, index) => ({ pageNumber: index + 1, label: s.name, colorMode: null, notes: null, required: s.required }));
    const existingPages = Array.isArray(req.pageInstructions) ? req.pageInstructions : [];

    await db.transaction(async (tx) => {
      await tx.update(artworkSlots).set({ slotKey: "DESIGN", name: "Production artwork", required: true, sortOrder: 0 }).where(eq(artworkSlots.id, keep.id));
      for (const s of drop) {
        await tx.update(artworkSlots).set({ isActive: false }).where(eq(artworkSlots.id, s.id));
      }
      await tx.update(artworkRequirements).set({
        pageInstructions: existingPages.length ? existingPages : pages,
        multiplePageInstructions: req.multiplePageInstructions ?? "Upload one CDR file with all sides as separate pages, in the order listed above.",
      }).where(eq(artworkRequirements.id, req.id));
    });

    changedCount += 1;
    console.log(`Consolidated: ${product?.name ?? req.productId} | scope: ${req.scopeKey} | ${slots.length} slots -> 1 (kept "${keep.name}", dropped: ${drop.map((s) => s.name).join(", ")})`);
  }

  console.log(`\nDone. Consolidated ${changedCount} artwork requirement(s) to a single upload slot.`);
  await pool.end();
}

main().catch((error) => { console.error(error); process.exit(1); });
