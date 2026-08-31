import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
  const { db, pool } = await import("../src/lib/db");
  const { notices } = await import("../src/lib/db/schema");

  console.log("Syncing clean, concise notices to database...");

  const cleanNotices = [
    {
      title: "Important: CDR artwork required for selected products",
      message: "",
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
      title: "Base prices shown; GST extra as applicable",
      message: "",
      tone: "INFO" as const,
      placement: "GLOBAL" as const,
      animationType: "MARQUEE" as const,
      priority: "NORMAL" as const,
      linkLabel: null,
      linkUrl: null,
      sortOrder: 1,
      isActive: true,
    },
    {
      title: "Bulk printing orders welcome",
      message: "Custom quotations available",
      tone: "SUCCESS" as const,
      placement: "GLOBAL" as const,
      animationType: "MARQUEE" as const,
      priority: "HIGH" as const,
      linkLabel: "Request a quote",
      linkUrl: "/quote",
      sortOrder: 2,
      isActive: true,
    },
    {
      title: "Selected products available with courier delivery",
      message: "Gujarat & Rajasthan dispatch",
      tone: "INFO" as const,
      placement: "GLOBAL" as const,
      animationType: "MARQUEE" as const,
      priority: "NORMAL" as const,
      linkLabel: null,
      linkUrl: null,
      sortOrder: 3,
      isActive: true,
    },
    {
      title: "Upload one CDR file for applicable card jobs",
      message: "Front, back & Spot UV in single file",
      tone: "WARNING" as const,
      placement: "GLOBAL" as const,
      animationType: "MARQUEE" as const,
      priority: "NORMAL" as const,
      linkLabel: null,
      linkUrl: null,
      sortOrder: 4,
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
    console.log(`  - [${r.animationType}] [${r.priority}] ${r.title} (placement: ${r.placement}, active: ${r.isActive})`);
  }

  await pool.end();
  console.log("Done!");
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
