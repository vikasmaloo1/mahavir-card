import Image from "next/image";

const focus: Record<string, string> = {
  "business-cards": "50% 74%",
  brochures: "17% 46%",
  flyers: "40% 73%",
  "product-labels": "88% 62%",
  "packaging-boxes": "75% 82%",
  "paper-bags": "68% 35%",
  letterheads: "24% 46%",
};

export function ProductImage({ alt, slug, src, priority = false }: { alt: string; slug: string; src: string; priority?: boolean }) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      className="object-cover"
      style={{ objectPosition: focus[slug] ?? "50% 55%" }}
    />
  );
}
