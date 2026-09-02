import Image from "next/image";

function resolveImageForSlug(slug: string, src?: string | null): string {
  if (src && src !== "/images/mahavir-print-assortment.png") {
    return src;
  }
  if (slug.startsWith("premium-")) return "/images/premium-card-category.jpg";
  if (slug.startsWith("art-card-")) return "/images/art-card-category.jpg";
  if (slug.startsWith("letterhead-") || slug.startsWith("envelope-") || slug.startsWith("cover-")) {
    return "/images/letterhead-envelope-category.jpg";
  }
  if (slug.startsWith("brochure-")) return "/images/brochure-category.jpg";
  if (slug.startsWith("leaflet-")) return "/images/leaflet-category.jpg";
  if (slug.startsWith("sticker-") || slug.startsWith("avery-")) return "/images/sticker-category.jpg";
  if (
    slug.startsWith("nt-") ||
    slug.startsWith("tearable-") ||
    slug.startsWith("400-gsm-") ||
    slug.startsWith("350-gsm-") ||
    slug.includes("visiting-card")
  ) {
    return "/images/visiting-card-category.jpg";
  }
  return src || "/images/home-hero-printing.jpg";
}

export function ProductImage({
  alt,
  slug,
  src,
  priority = false,
}: {
  alt: string;
  slug: string;
  src?: string | null;
  priority?: boolean;
}) {
  const finalSrc = resolveImageForSlug(slug, src);

  return (
    <Image
      src={finalSrc}
      alt={alt}
      fill
      priority={priority}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      className="object-cover"
    />
  );
}
