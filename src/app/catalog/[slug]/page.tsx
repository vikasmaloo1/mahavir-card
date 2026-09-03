import type { Metadata } from "next";
import { Clock3, FileUp, ShieldCheck } from "lucide-react";
import { and, asc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getCachedSession } from "@/lib/auth/session";
import Link from "next/link";

import { BackButton } from "@/components/back-button";
import { ProductConfigurator } from "@/components/product-configurator";
import { ProductImage } from "@/components/product-image";
import { ProductImageSlideshow } from "@/components/product-image-slideshow";
import { CustomerNotices } from "@/components/customer-notices";
import { StorefrontFooter } from "@/components/storefront-footer";
import { StorefrontHeader } from "@/components/storefront-header";
import { type CatalogProduct, type ConfigField } from "@/lib/catalog";
import { db } from "@/lib/db/server";
import { artworkRequirements, categories, pricingRules, productImages, products, productVariants } from "@/lib/db/schema";
import { conciseProductSpecification, deriveStartingPrice, type StartingPrice } from "@/lib/product-listing-pricing";
import { safeProductReturnPath } from "@/lib/catalog-routing";

export const dynamic = "force-dynamic";

const fallbackFields: ConfigField[] = [{ id: "quantity", label: "Quantity", type: "number", defaultValue: "100" }];
type PageProduct = CatalogProduct &
  StartingPrice & {
    artworkFormatLabel: string;
    images: Array<{ id: string; imageUrl: string; altText: string | null; label?: string }>;
  };

export async function generateMetadata({ params }: PageProps<"/catalog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getDatabaseCatalogProduct(slug, false);
  if (!product) {
    return {
      title: "Product Details | Mahavir Card",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${product.name} — ${product.category} Printing in Ahmedabad`,
    description: `${product.shortDescription} Available with CDR artwork upload and fast turnaround in Ahmedabad, Gujarat from Mahavir Card.`,
    alternates: {
      canonical: `/catalog/${product.slug}`,
    },
    openGraph: {
      title: `${product.name} | Mahavir Card Ahmedabad`,
      description: product.shortDescription,
      images: product.imageUrl ? [{ url: product.imageUrl }] : undefined,
    },
  };
}

async function getDatabaseCatalogProduct(slug: string, authenticated: boolean): Promise<PageProduct | null> {
  const [row] = await db.select({ product: products, category: { name: categories.name, slug: categories.slug } }).from(products).leftJoin(categories, eq(products.categoryId, categories.id)).where(and(eq(products.slug, slug), eq(products.isActive, true), eq(products.status, "ACTIVE"))).limit(1);
  if (!row) return null;

  const [rules, requirements, galleryImages] = await Promise.all([
    authenticated
      ? db
          .select({
            productId: pricingRules.productId,
            variantId: pricingRules.variantId,
            variantActive: productVariants.isActive,
            conditions: pricingRules.conditions,
            priceFormula: pricingRules.priceFormula,
            taxInclusive: pricingRules.taxInclusive,
            isActive: pricingRules.isActive,
          })
          .from(pricingRules)
          .leftJoin(productVariants, eq(pricingRules.variantId, productVariants.id))
          .where(and(eq(pricingRules.productId, row.product.id), eq(pricingRules.isActive, true)))
      : Promise.resolve([]),
    db
      .select({ acceptedFormats: artworkRequirements.acceptedFormats })
      .from(artworkRequirements)
      .where(and(eq(artworkRequirements.productId, row.product.id), eq(artworkRequirements.isActive, true))),
    db
      .select({ id: productImages.id, imageUrl: productImages.imageUrl, altText: productImages.altText })
      .from(productImages)
      .where(eq(productImages.productId, row.product.id))
      .orderBy(asc(productImages.sortOrder)),
  ]);
  const configuration = row.product.configuration as { fields?: unknown };
  const fields = Array.isArray(configuration.fields) ? (configuration.fields as ConfigField[]) : fallbackFields;

  return {
    id: row.product.id,
    category: row.category?.name ?? "Printing",
    categorySlug: row.category?.slug ?? "visiting-card",
    name: row.product.name,
    slug: row.product.slug,
    shortDescription: row.product.shortDescription ?? "Configure the details for your print job.",
    description: conciseProductSpecification(row.product.name, row.product.description, row.category?.name ?? null),
    unit: row.product.referenceQuantity ? `${row.product.referenceQuantity.toLocaleString("en-IN")} units` : "Configured quantity",
    turnaround:
      row.product.productionTime?.replace(/\bworking\s*days?\s+working\s*days?\b/gi, "working days").trim() ??
      "Confirmed after review",
    color: "blue",
    tags: [],
    configuration: fields.length ? fields : fallbackFields,
    imageUrl: row.product.imageUrl ?? "/images/visiting-card-category.jpg",
    orderable: row.product.orderable,
    quoteable: row.product.quoteable,
    images: galleryImages.length
      ? galleryImages.map((img, idx) => ({
          ...img,
          label: idx === 0 ? "Full Sample" : idx === 1 ? "Finish Close-up" : idx === 2 ? "Studio View" : `Photo ${idx + 1}`,
        }))
      : [
          {
            id: "1",
            imageUrl: row.product.imageUrl ?? "/images/visiting-card-category.jpg",
            altText: `${row.product.name} sample`,
            label: "Full Sample",
          },
          {
            id: "2",
            imageUrl: "/images/spot-uv-closeup.jpg",
            altText: `${row.product.name} finish`,
            label: "Finish Close-up",
          },
          {
            id: "3",
            imageUrl: "/images/home-hero-printing.jpg",
            altText: `${row.product.name} studio`,
            label: "Studio View",
          },
        ],
    ...(authenticated
      ? deriveStartingPrice(row.product, rules)
      : {
          startingPrice: null,
          startingQuantity: null,
          currency: "INR" as const,
          priceLabel: "Login to view price",
          priceState: "CONTACT" as const,
          taxInclusive: null,
        }),
    artworkFormatLabel: row.product.artworkRequired || requirements.length ? "CDR only" : "Optional",
  };
}

export default async function ProductPage({ params, searchParams }: PageProps<"/catalog/[slug]">) {
  const { slug } = await params;
  const query = await searchParams;
  if (slug === "business-cards") redirect("/products?category=visiting-card");
  const session = await getCachedSession();
  const product = await getDatabaseCatalogProduct(slug, Boolean(session));
  if (!product) notFound();
  const descriptor = `${product.category} · Commercial printing`;
  const returnPath = safeProductReturnPath(query.returnTo);
  const categoryHref = `/products?category=${product.categorySlug}`;

  // Derive material finish badges from product characteristics
  const finishes: Array<{ label: string; tone: string }> = [];
  const lower = (product.name + " " + (product.description || "")).toLowerCase();
  if (lower.includes("velvet")) finishes.push({ label: "Velvet Soft-Touch", tone: "bg-slate-900 text-white" });
  if (lower.includes("thermal") || lower.includes("matt")) finishes.push({ label: "Thermal Matt", tone: "bg-slate-100 text-slate-800" });
  if (lower.includes("spot uv") || lower.includes(" uv")) finishes.push({ label: "Selective Spot UV", tone: "bg-amber-50 text-amber-900 border border-amber-200/70" });
  if (lower.includes("foil")) finishes.push({ label: "Metallic Foil Stamping", tone: "bg-amber-100/70 text-amber-950 font-bold" });
  if (lower.includes("corner cut") || product.categorySlug === "premium-card") finishes.push({ label: "Corner Cut", tone: "bg-[#1e3a5f]/10 text-[#1e3a5f]" });
  if (lower.includes("250 gsm") || product.categorySlug === "art-card" || product.categorySlug === "brochure") finishes.push({ label: "250 GSM Art Card", tone: "bg-slate-100 text-slate-700" });

  // Contextual category note
  const categoryPromo: Record<string, { headline: string; note: string }> = {
    "visiting-card": { headline: "Tactile Business Cards", note: "Heavyweight card stocks with clean trimmed edges and high-definition offset ink density." },
    "premium-card": { headline: "Luxury Card Finishing", note: "400 GSM card stock with velvet soft-touch, precision rounded corner cutting, and optional spot UV or foil." },
    "art-card": { headline: "Heavy Coated Art Card", note: "250 GSM tearable art card stock calibrated for vibrant color reproduction and durable handling." },
    "letterhead-envelope": { headline: "Executive Stationery Set", note: "Standard 100 GSM Alabaster and SS finish papers for corporate correspondence and matching envelopes." },
    brochure: { headline: "250 GSM Art Card Brochures", note: "High-volume commercial brochure printing with sharp machine creasing and lamination options." },
    "leaflet-cover": { headline: "Commercial Flyer Runs", note: "130 GSM and 170 GSM art paper flyers for product launches, marketing drops, and trade distribution." },
    sticker: { headline: "Precision Die-Cut Stickers", note: "Strong adhesive backing on Avery and standard vinyl stocks, calculated by exact square inches." },
  };
  const promo = categoryPromo[product.categorySlug];

  return (
    <main className="mc-storefront min-h-screen bg-[#fcfbf9] text-slate-900">
      <StorefrontHeader />
      <CustomerNotices placement="ORDERING" />
      <div className="mx-auto max-w-[1440px] px-4 py-8 xl:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <BackButton fallbackHref={returnPath} label="Back to products" />
            <nav aria-label="Breadcrumb" className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <Link href="/" className="hover:text-[#1e3a5f]">Home</Link>
              <span>/</span>
              <Link href={returnPath} className="hover:text-[#1e3a5f]">Order now</Link>
              <span>/</span>
              <Link href={categoryHref} className="hover:text-[#1e3a5f]">{product.category}</Link>
              <span>/</span>
              <span aria-current="page" className="font-semibold text-slate-900">{product.name}</span>
            </nav>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-bold text-slate-700 shadow-xs">
            {descriptor}
          </span>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)] lg:items-start">
          {/* LEFT: Product Presentation & Gallery (~38%) with Slideshow */}
          <section className="space-y-6">
            <ProductImageSlideshow
              images={product.images}
              productName={product.name}
              categoryName={product.category}
            />

            {/* Visual Finish Badges */}
            {finishes.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {finishes.map((f) => (
                  <span key={f.label} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${f.tone}`}>
                    {f.label}
                  </span>
                ))}
              </div>
            )}

            {/* Specifications Bar */}
            <div className="grid grid-cols-3 gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <div>
                <Clock3 size={18} className="text-[#1e3a5f]" />
                <p className="mt-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Turnaround</p>
                <p className="mt-0.5 text-xs font-bold text-slate-900">{product.turnaround}</p>
              </div>
              <div>
                <ShieldCheck size={18} className="text-[#1e3a5f]" />
                <p className="mt-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Order Route</p>
                <p className="mt-0.5 text-xs font-bold text-slate-900">
                  {product.orderable ? (product.quoteable ? "Buy or Quote" : "Direct Buy") : "Quote Review"}
                </p>
              </div>
              <div>
                <FileUp size={18} className="text-[#1e3a5f]" />
                <p className="mt-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Artwork</p>
                <p className="mt-0.5 text-xs font-bold text-slate-900">{product.artworkFormatLabel}</p>
              </div>
            </div>

            {/* Product Overview Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1e3a5f]">
                Product Information
              </span>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {product.name}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {product.description}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-xs">
                <span className="font-bold text-slate-500 uppercase tracking-wider">Base Rate:</span>
                <strong className="text-base text-slate-950">{product.priceLabel}</strong>
                {product.startingPrice ? (
                  <span className="text-slate-400">
                    {product.taxInclusive ? "(GST included)" : "(GST extra as applicable)"}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Contextual Category Promo */}
            {promo && (
              <div className="rounded-2xl border border-slate-200/80 bg-[#f8fafc] p-4 text-xs shadow-xs">
                <p className="font-bold text-slate-900">{promo.headline}</p>
                <p className="mt-1 text-slate-600">{promo.note}</p>
              </div>
            )}
          </section>

          {/* RIGHT: Configurator Workspace (~62%) */}
          <aside className="lg:sticky lg:top-[120px]">
            <ProductConfigurator
              product={product}
              editItemId={typeof query.editItem === "string" ? query.editItem : undefined}
              editKind={query.kind === "QUOTE" ? "QUOTE" : "PURCHASE"}
              templateName={typeof query.templateName === "string" ? query.templateName : undefined}
            />
          </aside>
        </div>
      </div>
      <StorefrontFooter />
    </main>
  );
}
