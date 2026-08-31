import { config as loadEnv } from "dotenv";
import { Client } from "pg";

import { rateCatalog } from "../src/lib/rate-catalog";

loadEnv({ path: ".env.local", quiet: true });

type ArtworkRuleRow = {
  slug: string;
  acceptedFormats: string[];
  designWidth: string | null;
  designHeight: string | null;
  safeAreaWidth: string | null;
  safeAreaHeight: string | null;
  finalWidth: string | null;
  finalHeight: string | null;
  maxFiles: number;
};

function dimension(value: number | undefined) {
  return value === undefined ? null : value.toFixed(3);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();
    const result = await client.query<ArtworkRuleRow>(`
      select
        p.slug,
        ar."acceptedFormats",
        ar."designWidth",
        ar."designHeight",
        ar."safeAreaWidth",
        ar."safeAreaHeight",
        ar."finalWidth",
        ar."finalHeight",
        ar."maxFiles"
      from products p
      inner join artwork_requirements ar
        on ar."productId" = p.id and ar."isActive" = true
      where p."productReference" like 'RATE.xlsx/%'
        and p."isActive" = true
      order by p."sortOrder", p.name
    `);

    const expected = new Map(rateCatalog.flatMap((category) => category.items.map((item) => [item.slug, item] as const)));
    if (result.rows.length !== expected.size) throw new Error(`Expected ${expected.size} RATE.xlsx artwork rules, found ${result.rows.length}`);

    for (const rule of result.rows) {
      const item = expected.get(rule.slug);
      if (!item) throw new Error(`${rule.slug} is not present in RATE.xlsx catalog data`);
      if (rule.acceptedFormats.length !== 1 || rule.acceptedFormats[0] !== "CDR") throw new Error(`${rule.slug} must accept CDR only`);
      if (rule.designWidth !== dimension(item.artwork.design?.[0]) || rule.designHeight !== dimension(item.artwork.design?.[1])) throw new Error(`${rule.slug} full-design size differs from its workbook tab`);
      if (rule.safeAreaWidth !== dimension(item.artwork.safe?.[0]) || rule.safeAreaHeight !== dimension(item.artwork.safe?.[1])) throw new Error(`${rule.slug} safe-area size differs from its workbook tab`);
      if (rule.finalWidth !== dimension(item.artwork.final?.[0]) || rule.finalHeight !== dimension(item.artwork.final?.[1])) throw new Error(`${rule.slug} final size differs from its workbook tab`);
      if (rule.maxFiles !== 1) throw new Error(`${rule.slug} must accept one CDR file containing its required artwork pages, found ${rule.maxFiles} upload slots`);
    }

    console.log(`Artwork verification passed for ${result.rows.length} RATE.xlsx products.`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Artwork rule verification failed");
  process.exitCode = 1;
});
