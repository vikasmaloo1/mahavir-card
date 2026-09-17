import type { Metadata } from "next";
import { ArrowRight, Clock3, FileUp, ShieldCheck } from "lucide-react";
import { and, asc, eq, or } from "drizzle-orm";
import { notFound, permanentRedirect } from "next/navigation";
import { getCachedSession } from "@/lib/auth/session";
import Link from "next/link";

import { BackButton } from "@/components/back-button";
import { ProductConfigurator } from "@/components/product-configurator";
import { ProductImageSlideshow } from "@/components/product-image-slideshow";
import { CustomerNotices } from "@/components/customer-notices";
import { StorefrontFooter } from "@/components/storefront-footer";
import { StorefrontHeader } from "@/components/storefront-header";
import { type CatalogProduct, type ConfigField } from "@/lib/catalog";
import { db } from "@/lib/db/server";
import { artworkRequirements, categories, customers, pricingRules, productImages, products, productVariants } from "@/lib/db/schema";
import { conciseProductSpecification, deriveStartingPrice, type StartingPrice } from "@/lib/product-listing-pricing";
import { resolveCategorySlug, safeProductReturnPath } from "@/lib/catalog-routing";
import { categoryHref } from "@/lib/seo-categories";

export const dynamic = "force-dynamic";

const fallbackFields: ConfigField[] = [{ id: "quantity", label: "Quantity", type: "number", defaultValue: "100" }];
type PageProduct = CatalogProduct &
  StartingPrice & {
    artworkFormatLabel: string;
    images: Array<{ id: string; imageUrl: string; altText: string | null; label?: string }>;
    customerType: "B2C" | "B2B" | null;
  };

export async function generateMetadata({ params }: PageProps<"/catalog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  // Redirect/404 here, not only in the page body: metadata resolves before streaming starts, so
  // this is what makes the response a real 308/404 instead of a 200 shell (a soft-404 to Google).
  const categorySlug = resolveCategorySlug(slug);
  if (categorySlug) permanentRedirect(categoryHref(categorySlug));
  const product = await getDatabaseCatalogProduct(slug, null);
  if (!product) notFound();

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

async function getDatabaseCatalogProduct(slug: string, customerType: "B2C" | "B2B" | null): Promise<PageProduct | null> {
  const [row] = await db.select({ product: products, category: { name: categories.name, slug: categories.slug } }).from(products).leftJoin(categories, eq(products.categoryId, categories.id)).where(and(eq(products.slug, slug), eq(products.isActive, true), eq(products.status, "ACTIVE"))).limit(1);
  if (!row) return null;

  const effectiveType = customerType ?? "B2C";
  const [rules, requirements, galleryImages] = await Promise.all([
    db
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
      .where(and(eq(pricingRules.productId, row.product.id), eq(pricingRules.isActive, true), or(eq(pricingRules.customerType, effectiveType), eq(pricingRules.customerType, "BOTH")))),
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
    ...(customerType
      ? deriveStartingPrice(row.product, rules)
      : {
          startingPrice: null,
          startingQuantity: null,
          currency: "INR",
          priceLabel: "Login to view price",
          priceState: "LOGIN" as const,
          taxInclusive: null,
        }),
    artworkFormatLabel: row.product.artworkRequired || requirements.length ? "CDR only" : "Optional",
    customerType,
  };
}

export default async function ProductPage({ params, searchParams }: PageProps<"/catalog/[slug]">) {
  const { slug } = await params;
  const query = await searchParams;
  const categorySlug = resolveCategorySlug(slug);
  if (categorySlug) permanentRedirect(categoryHref(categorySlug));
  const session = await getCachedSession();
  let customerType: "B2C" | "B2B" | null = null;
  if (session?.user?.id) {
    const [customer] = await db.select({ customerType: customers.customerType }).from(customers).where(eq(customers.userId, session.user.id)).limit(1);
    customerType = customer?.customerType === "B2B" ? "B2B" : "B2C";
  }
  const product = await getDatabaseCatalogProduct(slug, customerType);
  if (!product) {
    notFound();
  }
  const descriptor = `${product.category} · Commercial printing`;
  const returnPath = safeProductReturnPath(query.returnTo);
  const categoryPath = categoryHref(product.categorySlug);

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

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || product.shortDescription,
    image: product.imageUrl ? [`https://mahavircard.in${product.imageUrl.startsWith("/") ? "" : "/"}${product.imageUrl}`] : undefined,
    sku: product.slug,
    category: product.category,
    brand: {
      "@type": "Brand",
      name: "Mahavir Card",
    },
    ...(product.startingPrice
      ? {
          offers: {
            "@type": "Offer",
            url: `https://mahavircard.in/catalog/${product.slug}`,
            priceCurrency: "INR",
            price: String(product.startingPrice),
            priceValidUntil: "2027-12-31",
            availability: "https://schema.org/InStock",
            seller: {
              "@type": "Organization",
              name: "Mahavir Card",
            },
          },
        }
      : {}),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://mahavircard.in",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Products",
        item: "https://mahavircard.in/products",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.category,
        item: `https://mahavircard.in${categoryHref(product.categorySlug)}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: product.name,
        item: `https://mahavircard.in/catalog/${product.slug}`,
      },
    ],
  };

  return (
    <main className="mc-storefront min-h-screen bg-[#fcfbf9] text-slate-900 pb-24 sm:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <StorefrontHeader />
      <CustomerNotices placement="ORDERING" />
      <div className="mx-auto max-w-[1440px] px-4 py-4 sm:py-6 xl:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div>
            <BackButton fallbackHref={returnPath} label="Back to products" />
            <nav aria-label="Breadcrumb" className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              <Link href="/" className="hover:text-[#1e3a5f]">Home</Link>
              <span>/</span>
              <Link href={returnPath} className="hover:text-[#1e3a5f]">Order now</Link>
              <span>/</span>
              <Link href={categoryPath} className="hover:text-[#1e3a5f]">{product.category}</Link>
              <span>/</span>
              <span aria-current="page" className="font-semibold text-slate-900">{product.name}</span>
            </nav>
          </div>
          <span className="rounded-full border border-[#d5e3f1] bg-[#edf4fb] px-3.5 py-1 text-xs font-bold text-[#1b365d] shadow-2xs">
            {descriptor}
          </span>
        </div>

        <div className="mt-4 sm:mt-5 grid gap-5 lg:gap-6 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] lg:items-start">
          {/* LEFT: Product Presentation & Gallery */}
          <section className="space-y-3.5 sm:space-y-4">
            <ProductImageSlideshow
              images={product.images}
              productName={product.name}
              categoryName={product.category}
            />

            {/* Visual Finish Badges */}
            {finishes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {finishes.map((f) => (
                  <span key={f.label} className={`rounded-md px-2 py-0.5 text-xs font-semibold ${f.tone}`}>
                    {f.label}
                  </span>
                ))}
              </div>
            )}

            {/* Specifications Bar */}
            <div className="grid grid-cols-3 gap-2.5 rounded-xl border border-[#d5e3f1]/90 bg-[#f8fafd] p-3 shadow-2xs">
              <div>
                <Clock3 size={16} className="text-[#1e3a5f]" />
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Turnaround</p>
                <p className="mt-0.5 text-xs font-bold text-slate-900">{product.turnaround}</p>
              </div>
              <div>
                <ShieldCheck size={16} className="text-[#1e3a5f]" />
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Order Route</p>
                <p className="mt-0.5 text-xs font-bold text-slate-900">
                  {product.orderable ? (product.quoteable ? "Buy or Quote" : "Direct Buy") : "Quote Review"}
                </p>
              </div>
              <div>
                <FileUp size={16} className="text-[#1e3a5f]" />
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Artwork</p>
                <p className="mt-0.5 text-xs font-bold text-slate-900">{product.artworkFormatLabel}</p>
              </div>
            </div>

            {/* Product Overview Card */}
            <div className="rounded-xl border border-[#ece4d7] bg-[#faf8f4] p-3.5 sm:p-4 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1e3a5f]">
                Product Information
              </span>
              <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                {product.name}
              </h1>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                {product.description}
              </p>

              {product.customerType ? (
                <div className="mt-3 flex flex-wrap items-center gap-2.5 border-t border-slate-200/60 pt-2.5 text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Rate:</span>
                  <strong className="text-sm sm:text-base text-slate-950">{product.priceLabel}</strong>
                  {product.startingPrice && product.customerType !== "B2B" ? (
                    <span className="text-slate-500 text-[11px]">
                      {product.taxInclusive ? "(GST included)" : "(GST extra as applicable)"}
                    </span>
                  ) : null}
                </div>
              ) : (
                <div className="mt-3 rounded-lg bg-[#edf4fb] border border-[#d5e3f1] p-2.5 text-xs text-[#1b365d] flex items-center justify-between gap-2">
                  <span>Sign in to view rates and place orders</span>
                  <Link href={`/login?next=${encodeURIComponent(`/catalog/${product.slug}`)}`} className="font-bold text-[#1e3a5f] hover:underline shrink-0">
                    Login / Sign up &rarr;
                  </Link>
                </div>
              )}
            </div>

            {/* Contextual Category Promo */}
            {promo && (
              <div className="rounded-xl border border-slate-200/80 bg-[#f8fafc] p-3 text-xs shadow-xs">
                <p className="font-bold text-slate-900">{promo.headline}</p>
                <p className="mt-0.5 text-slate-600">{promo.note}</p>
              </div>
            )}
          </section>

          {/* RIGHT: Configurator Workspace (~60%) */}
          <aside className="lg:sticky lg:top-[90px]">
            <ProductConfigurator
              product={product}
              editItemId={typeof query.editItem === "string" ? query.editItem : undefined}
              editKind={query.kind === "QUOTE" ? "QUOTE" : "PURCHASE"}
              templateName={typeof query.templateName === "string" ? query.templateName : undefined}
            />
          </aside>
        </div>
      </div>

      {/* 2. ARTWORK GUIDELINES & PRE-PRESS VERIFICATION (Soft Lavender) */}
      <section className="mt-12 w-full border-t border-[#e6e0f2] mc-section-lavender py-10 lg:py-14">
        <div className="mx-auto max-w-[1440px] px-4 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d7cbef] bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#372a5f] shadow-2xs">
              Pre-Press Checklist
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Artwork Requirements for {product.name}
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              To ensure sharp offset plates and accurate finishing, follow our standard pre-press tolerances before finalizing your order.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <p className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f]">File Format &amp; Color</p>
              <p className="mt-1 text-sm font-bold text-slate-900">CorelDRAW (.CDR) &bull; CMYK</p>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Convert all RGB to CMYK mode. Avoid 4-color rich black mixes on small typography to prevent color fringing.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <p className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f]">Bleed &amp; Margins</p>
              <p className="mt-1 text-sm font-bold text-slate-900">2 mm Safe Margin</p>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Keep critical logos and contact text at least 2 mm away from die-cut edges to account for machine movement.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <p className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f]">Finishing Separations</p>
              <p className="mt-1 text-sm font-bold text-slate-900">100% K for Spot UV &amp; Foil</p>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                For selective spot UV or gold foil, provide UV/foil elements on separate pages in 100% solid Black (K).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CTA / CUSTOM ASSISTANCE (Soft Mint) */}
      <section className="w-full border-t border-[#d2eade] mc-section-mint py-10">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-6 px-4 sm:flex-row sm:items-center lg:px-8">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#bddfcb] bg-white px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-[#174834] shadow-2xs">
              <span className="size-1.5 rounded-full bg-[#174834]" />
              Need a Custom Variation?
            </div>
            <h3 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-slate-950">
              Need custom quantities, different paper stocks, or bespoke finishing?
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Request a custom quotation tailored to your exact print dimensions and volume requirements.
            </p>
          </div>
          <Link
            href="/quote"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#1e3a5f] px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#152a45]"
          >
            Request Custom Quote <ArrowRight size={16} />
          </Link>
        </div>
      </section>
      <StorefrontFooter />
    </main>
  );
}
