import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";

import type { CatalogProduct } from "@/lib/catalog";
import { ProductImage } from "@/components/product-image";

export function ProductCard({ product }: { product: CatalogProduct & { priceLabel: string } }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-[#1e3a5f]/40 hover:shadow-md">
      <Link href={`/catalog/${product.slug}`} className="relative block aspect-[1.4] overflow-hidden bg-slate-100">
        <ProductImage src={product.imageUrl} alt={`${product.name} print sample`} slug={product.slug} />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <span className="rounded-md bg-white/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-800 shadow-xs backdrop-blur-xs">
            {product.category}
          </span>
          {product.orderable && (
            <span className="rounded-md bg-[#1e3a5f] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-xs">
              Buy online
            </span>
          )}
        </div>
      </Link>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 transition-colors group-hover:text-[#1e3a5f]">
              {product.name}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 line-clamp-2">
              {product.shortDescription}
            </p>
          </div>
          <Clock3 className="mt-1 shrink-0 text-slate-400" size={16} />
        </div>
        <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Starting price</p>
            <p className="mt-0.5 text-base font-bold text-slate-900">{product.priceLabel}</p>
            <p className="text-[10px] text-slate-400">Exclusive of GST</p>
          </div>
          <span className="text-xs font-semibold text-slate-600">{product.turnaround}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            href={`/catalog/${product.slug}`}
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:border-[#1e3a5f] hover:text-[#1e3a5f]"
          >
            Configure
          </Link>
          <Link
            href={`/catalog/${product.slug}`}
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#1e3a5f] px-3 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#152a45]"
          >
            Order now <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}
