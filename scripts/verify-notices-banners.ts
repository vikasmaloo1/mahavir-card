import dotenv from "dotenv";
import { eq } from "drizzle-orm";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
  const { db, pool } = await import("../src/lib/db");
  const { banners, notices } = await import("../src/lib/db/schema");

  const noticeRows = await db.select().from(notices).where(eq(notices.isActive, true));
  const bannerRows = await db.select().from(banners).where(eq(banners.isActive, true));
  if (!noticeRows.length) throw new Error("No active customer notices are configured");

  const invalidNotice = noticeRows.find((notice) =>
    !notice.title.trim()
    || !notice.message.trim()
    || !["MARQUEE", "STATIC"].includes(notice.animationType)
  );
  if (invalidNotice) throw new Error("Invalid notice configuration: " + invalidNotice.id);

  const invalidBanner = bannerRows.find((banner) =>
    !banner.title.trim()
    || !["FADE", "SLIDE_UP", "IMAGE_ZOOM", "NONE"].includes(banner.animationType)
  );
  if (invalidBanner) throw new Error("Invalid banner configuration: " + invalidBanner.id);

  const distinctNotices = new Set(
    noticeRows.map((notice) => notice.title.trim().toLowerCase() + "|" + notice.message.trim().toLowerCase()),
  );
  console.log(JSON.stringify({
    activeNoticeRows: noticeRows.length,
    distinctDisplayNotices: distinctNotices.size,
    duplicateRowsHiddenByStorefront: noticeRows.length - distinctNotices.size,
    marqueeNotices: noticeRows.filter((notice) => notice.animationType === "MARQUEE").length,
    staticNotices: noticeRows.filter((notice) => notice.animationType === "STATIC").length,
    activeBanners: bannerRows.length,
  }, null, 2));

  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
