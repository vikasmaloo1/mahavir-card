import { generateCatalogPdf } from "@/lib/catalog-pdf";
import { getCatalogModel, isCatalogPriceMode, type CatalogPriceMode } from "@/lib/catalog-model";

export const dynamic = "force-dynamic";

const FILENAMES: Record<CatalogPriceMode, string> = {
  RANGE: "Mahavir-Card-Catalogue-All-Rates.pdf",
  RETAIL: "Mahavir-Card-Catalogue-Retail.pdf",
  B2B: "Mahavir-Card-Catalogue-Trade-Wholesale.pdf",
  SHOWROOM: "Mahavir-Card-Catalogue-Showroom.pdf",
};

/**
 * Generates the official product catalogue as a vector PDF from the same CatalogModel the
 * /catalog page renders, for the mode the visitor currently has selected.
 */
export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get("mode");
  const mode: CatalogPriceMode = isCatalogPriceMode(requested) ? requested : "RANGE";

  const model = await getCatalogModel();
  const bytes = await generateCatalogPdf(model, mode);

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${FILENAMES[mode]}"`,
      "Cache-Control": "no-store",
    },
  });
}
