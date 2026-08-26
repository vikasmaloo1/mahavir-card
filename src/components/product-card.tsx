import Link from "next/link";
import { ArrowRight, Clock3, ReceiptText } from "lucide-react";

import type { CatalogProduct } from "@/lib/catalog";
import { ProductImage } from "@/components/product-image";

export function ProductCard({ product }: { product: CatalogProduct }) {
  return (
    <article className="group relative flex flex-col border border-[var(--mc-line-strong)] bg-[var(--mc-paper)] transition-colors duration-300 hover:border-[var(--mc-ink)]">
      {/* Corner tick, the way a trim mark sits outside the live area. */}
      <span
        aria-hidden
        className="absolute -left-px -top-px size-3 border-l-2 border-t-2 border-[var(--mc-accent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      <Link href={`/catalog/${product.slug}`} className="relative block aspect-[1.45] overflow-hidden bg-[#ece7de]">
        <div className="absolute inset-0 transition-transform duration-[900ms] ease-out group-hover:scale-[1.05]">
          <ProductImage src={product.imageUrl} alt={`${product.name} print sample`} slug={product.slug} />
        </div>
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <span className="mc-ticket bg-[var(--mc-surface)]/95 px-2.5 py-1.5 text-[var(--mc-ink-soft)]">{product.category}</span>
          {product.orderable && (
            <span className="mc-ticket bg-[var(--mc-ink)] px-2.5 py-1.5 text-white">Buy online</span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="mc-display text-[21px] font-semibold leading-tight text-[var(--mc-ink)]">{product.name}</h3>
            <p className="mt-1.5 text-sm leading-5 text-[var(--mc-muted)]">{product.shortDescription}</p>
          </div>
          <Clock3 className="mt-1 shrink-0 text-[var(--mc-faint)]" size={16} />
        </div>

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-[var(--mc-line)] pt-3">
          <div>
            <p className="mc-ticket text-[var(--mc-faint)]">{product.orderable ? "From" : "Pricing"}</p>
            <p className="mc-nums mt-1.5 text-sm font-bold text-[var(--mc-ink)]">
              {product.orderable ? `Rs ${product.startingPrice.toLocaleString("en-IN")} / ${product.unit}` : "Request a tailored quote"}
            </p>
          </div>
          <span className="mc-nums shrink-0 text-xs text-[var(--mc-faint)]">{product.turnaround}</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            href={`/catalog/${product.slug}`}
            className="mc-wipe inline-flex items-center justify-center gap-1.5 border border-[var(--mc-line-strong)] px-3 py-2.5 text-xs font-bold text-[var(--mc-ink)] transition-colors duration-300 hover:border-[var(--mc-ink)] hover:text-white"
          >
            Configure <ArrowRight size={14} />
          </Link>
          {product.orderable ? (
            <Link
              href={`/catalog/${product.slug}`}
              className="mc-wipe inline-flex items-center justify-center gap-1.5 border border-[var(--mc-accent)] bg-[var(--mc-accent)] px-3 py-2.5 text-xs font-bold text-white transition-colors duration-300 hover:border-[var(--mc-ink)]"
            >
              Buy now <ArrowRight size={14} />
            </Link>
          ) : (
            <Link
              href={`/catalog/${product.slug}`}
              className="inline-flex items-center justify-center gap-1.5 bg-[var(--mc-ink)] px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[var(--mc-accent)]"
            >
              Quote <ReceiptText size={14} />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
