import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
  const { db, pool } = await import("../src/lib/db");
  const { notices, banners } = await import("../src/lib/db/schema");

  console.log("Checking notices and banners in database...");
  const noticeRows = await db.select().from(notices);
  console.log(`Found ${noticeRows.length} notices:`);
  for (const n of noticeRows) {
    console.log(`  - [${n.animationType}] [${n.priority}] ${n.title} (placement: ${n.placement}, active: ${n.isActive})`);
  }

  const bannerRows = await db.select().from(banners);
  console.log(`Found ${bannerRows.length} banners:`);
  for (const b of bannerRows) {
    console.log(`  - [${b.animationType}] ${b.title} (placement: ${b.placement}, active: ${b.isActive})`);
  }

  await pool.end();
  console.log("Verification complete.");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
