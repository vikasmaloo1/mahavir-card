"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

type Category = { id?: string; name: string; slug: string; description: string | null; imageUrl?: string | null };

const categoryFocus: Record<string, string> = {
  "visiting-card": "53% 76%",
  "premium-card": "20% 46%",
  "art-card": "69% 31%",
  "letterhead-envelope": "91% 58%",
  brochure: "35% 70%",
  "leaflet-cover": "25% 43%",
  sticker: "72% 78%",
};

export function HomeCatalogSections({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState(initialCategories);

  useEffect(() => {
    if (initialCategories && initialCategories.length > 0) return;
    let active = true;
    fetch("/api/categories")
      .then((response) => response.json())
      .then((payload) => {
        if (active && payload.success) setCategories(payload.data);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [initialCategories]);

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-12 lg:px-8 lg:py-16">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-xs font-bold uppercase text-[var(--mc-accent)]">Product families</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-[2rem]">Start with what you need printed.</h2>
        </div>
        <Link href="/products" className="hidden items-center gap-2 text-[15px] font-bold text-[var(--mc-accent)] sm:inline-flex">Order now <ArrowRight size={17} /></Link>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category, index) => (
          <Link key={category.slug} href={"/products?category=" + category.slug} className="group grid min-h-36 grid-cols-[7.25rem_1fr] overflow-hidden rounded-lg border border-[var(--mc-line)] bg-[var(--mc-paper)] shadow-[0_8px_24px_rgba(16,33,63,0.05)] transition hover:border-[var(--mc-accent)] hover:shadow-[0_14px_34px_rgba(40,100,220,0.14)]">
            <div className="relative overflow-hidden bg-[var(--mc-accent-soft)]"><Image src={category.imageUrl || "/images/mahavir-print-assortment.png"} alt="" fill sizes="112px" className="object-cover transition duration-300 group-hover:scale-[1.03]" style={{ objectPosition: category.imageUrl ? "50% 50%" : categoryFocus[category.slug] ?? "50% 55%" }} /></div>
            <div className="flex min-w-0 items-center justify-between gap-3 p-5">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase text-[var(--mc-accent)]">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-1.5 text-lg font-bold text-[var(--mc-ink)]">{category.name}</h3>
                <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-[var(--mc-muted)]">{category.description}</p>
              </div>
              <ArrowRight size={19} className="shrink-0 text-[var(--mc-muted)] transition group-hover:translate-x-1 group-hover:text-[var(--mc-accent)]" />
            </div>
          </Link>
        ))}
      </div>
      <Link href="/products" className="mt-5 inline-flex items-center gap-2 text-[15px] font-bold text-[var(--mc-accent)] sm:hidden">Order now <ArrowRight size={17} /></Link>
    </section>
  );
}
