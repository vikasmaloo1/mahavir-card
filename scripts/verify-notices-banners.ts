import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
  const { db, pool } = await import("../src/lib/db");
  const { notices } = await import("../src/lib/db/schema");

  console.log("Syncing clean, print-accurate notices to database...");

  const cleanNotices = [
    {
      title: "Visiting Card artwork",
      message: "Final size 90 × 53 mm · Convert fonts to curves",
      tone: "INFO" as const,
      placement: "GLOBAL" as const,
      animationType: "MARQUEE" as const,
      priority: "HIGH" as const,
      linkLabel: "View products",
      linkUrl: "/products",
      sortOrder: 0,
      isActive: true,
    },
    {
      title: "Artwork filenames",
      message: "Use short file names and avoid special characters",
      tone: "WARNING" as const,
      placement: "GLOBAL" as const,
      animationType: "MARQUEE" as const,
      priority: "HIGH" as const,
      linkLabel: null,
      linkUrl: null,
      sortOrder: 1,
      isActive: true,
    },
    {
      title: "Base prices shown",
      message: "GST charged additionally as applicable on print jobs",
      tone: "INFO" as const,
      placement: "GLOBAL" as const,
      animationType: "MARQUEE" as const,
      priority: "NORMAL" as const,
      linkLabel: null,
      linkUrl: null,
      sortOrder: 2,
      isActive: true,
    },
    {
      title: "Bulk printing orders welcome",
      message: "Custom quotations available for volume orders",
      tone: "SUCCESS" as const,
      placement: "GLOBAL" as const,
      animationType: "MARQUEE" as const,
      priority: "HIGH" as const,
      linkLabel: "Request a quote",
      linkUrl: "/quote",
      sortOrder: 3,
      isActive: true,
    },
    {
      title: "Color guideline",
      message: "Avoid 4-color rich black mix to prevent shade variation",
      tone: "INFO" as const,
      placement: "GLOBAL" as const,
      animationType: "MARQUEE" as const,
      priority: "NORMAL" as const,
      linkLabel: null,
      linkUrl: null,
      sortOrder: 4,
      isActive: true,
    },
    {
      title: "Direct courier delivery",
      message: "Gujarat & Rajasthan dispatch on selected products",
      tone: "INFO" as const,
      placement: "GLOBAL" as const,
      animationType: "MARQUEE" as const,
      priority: "NORMAL" as const,
      linkLabel: null,
      linkUrl: null,
      sortOrder: 5,
      isActive: true,
    },
    {
      title: "CDR artwork requirements",
      message: "Include front, back & Spot UV separation in a single file",
      tone: "WARNING" as const,
      placement: "GLOBAL" as const,
      animationType: "MARQUEE" as const,
      priority: "NORMAL" as const,
      linkLabel: null,
      linkUrl: null,
      sortOrder: 6,
      isActive: true,
    },
  ];

  // Clear existing and re-insert
  await db.delete(notices);
  for (const n of cleanNotices) {
    await db.insert(notices).values(n);
  }

  const rows = await db.select().from(notices);
  console.log(`Successfully synced ${rows.length} notices:`);
  for (const r of rows) {
    console.log(`  - [${r.animationType}] [${r.priority}] ${r.title} — ${r.message} (active: ${r.isActive})`);
  }

  await pool.end();
  console.log("Done!");
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
