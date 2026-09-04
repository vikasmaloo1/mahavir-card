import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";

export function MarketingBreadcrumb({ label }: { label: string }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-[var(--mc-muted)]">
      <Link href="/" className="hover:text-[var(--mc-accent)]">Home</Link>
      <ChevronRight size={14} />
      <span className="text-[var(--mc-ink)]">{label}</span>
    </nav>
  );
}

export function MarketingHero({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <header className="mt-5 border-b border-[var(--mc-line)] pb-8">
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--mc-accent)]">{eyebrow}</p>
      <h1 className="mt-2 max-w-3xl text-3xl font-bold leading-tight text-[var(--mc-ink)] sm:text-[2.35rem]">{title}</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-6 text-[var(--mc-muted)]">{description}</p>
    </header>
  );
}

export function MarketingCtaBand({
  title,
  description,
  primary,
  secondary,
}: {
  title: string;
  description: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
}) {
  return (
    <section className="mt-14 rounded-2xl bg-[var(--mc-navy)] text-white">
      <div className="flex flex-col justify-between gap-6 px-6 py-10 sm:flex-row sm:items-center sm:px-10">
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
          <p className="mt-2 max-w-xl text-sm text-[#b7c7e5]">{description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <Link
            href={primary.href}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-[var(--mc-accent)] shadow-sm transition hover:bg-slate-100"
          >
            {primary.label} <ArrowRight size={16} />
          </Link>
          {secondary ? (
            <Link
              href={secondary.href}
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              {secondary.label}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function SectionEyebrow({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--mc-line)] bg-[var(--mc-surface)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-700 shadow-xs">
      <span className="size-1.5 rounded-full bg-[var(--mc-accent)]" />
      {label}
    </div>
  );
}
