import { generateCatalogPdf } from "@/lib/catalog-pdf";
import { getCatalogViewer, resolveCatalogMode } from "@/lib/catalog-access";
import { getCatalogModel, type CatalogPriceMode } from "@/lib/catalog-model";

export const dynamic = "force-dynamic";

const FILENAMES: Record<CatalogPriceMode, string> = {
  RETAIL: "Mahavir-Card-Catalogue-Retail.pdf",
  B2B: "Mahavir-Card-Catalogue-Trade-Wholesale.pdf",
  SHOWROOM: "Mahavir-Card-Catalogue-Showroom.pdf",
};

/**
 * Generates the official product catalogue as a vector PDF from the same CatalogModel the
 * /catalog page renders, for the mode the visitor currently has selected.
 *
 * Access is checked here too, not just on the page: the mode is narrowed to what the signed-in
 * viewer may see, so a retail account cannot fetch the trade edition by editing the query string.
 */
export async function GET(request: Request) {
  const viewer = await getCatalogViewer();
  if (!viewer) {
    return new Response("Sign in to download the catalogue.", {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const requested = new URL(request.url).searchParams.get("mode");
  const mode = resolveCatalogMode(viewer, requested);

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
