import { config as loadEnv } from "dotenv";
import { Client } from "pg";

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
  pageInstructions: Array<{ pageNumber: number; label: string }>;
  multiplePageInstructions: string | null;
};

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
        ar."pageInstructions",
        ar."multiplePageInstructions"
      from products p
      inner join artwork_requirements ar
        on ar."productId" = p.id and ar."scopeKey" = 'PRODUCT'
      where p.slug like 'business-card-%' and p."isActive" = true
      order by p."sortOrder", p.name
    `);

    if (result.rows.length !== 11) throw new Error(`Expected 11 visiting-card artwork rules, found ${result.rows.length}`);

    for (const rule of result.rows) {
      const formats = new Set(rule.acceptedFormats);
      if (!formats.has("PDF") || !formats.has("CDR")) throw new Error(`${rule.slug} must accept PDF and CDR`);
      if (rule.designWidth !== "93.000" || rule.designHeight !== "56.000") throw new Error(`${rule.slug} has an incorrect full-design size`);
      if (rule.safeAreaWidth !== "82.000" || rule.safeAreaHeight !== "45.000") throw new Error(`${rule.slug} has an incorrect safe-area size`);
      if (rule.finalWidth !== "90.000" || rule.finalHeight !== "53.000") throw new Error(`${rule.slug} has an incorrect final size`);
      if (!rule.pageInstructions.length || rule.pageInstructions[0]?.pageNumber !== 1) throw new Error(`${rule.slug} is missing ordered page instructions`);
      if (!rule.multiplePageInstructions) throw new Error(`${rule.slug} is missing multi-page instructions`);
    }

    console.log(`Artwork rule verification passed for ${result.rows.length} visiting-card products.`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Artwork rule verification failed");
  process.exitCode = 1;
});
