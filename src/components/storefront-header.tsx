import Link from "next/link";
import Image from "next/image";
import { FileText, Search, ShoppingBag, UserRound } from "lucide-react";

const categoryLinks = [
  { label: "All products", href: "/catalog" },
  { label: "Printing", href: "/catalog?category=printing" },
  { label: "Packaging", href: "/catalog?category=packaging" },
  { label: "Labels & stickers", href: "/catalog?category=labels-stickers" },
  { label: "Stationery", href: "/catalog?category=stationery" },
  { label: "Branding & signage", href: "/catalog?category=branding-signage" },
  { label: "Corporate gifting", href: "/catalog?category=corporate-gifting" },
];

export function StorefrontHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--mc-line-strong)] bg-[var(--mc-surface)]/92 backdrop-blur-md">
      {/* Press strip: the colour bar every printer runs along the edge of a sheet. */}
      <div className="flex h-[3px] w-full">
        <span className="flex-1 bg-[var(--mc-cyan)]" />
        <span className="flex-1 bg-[var(--mc-magenta)]" />
        <span className="flex-1 bg-[var(--mc-yellow)]" />
        <span className="flex-1 bg-[var(--mc-ink)]" />
      </div>

      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 lg:px-8">
        <Link href="/" className="group flex shrink-0 items-center gap-3" aria-label="Mahavir Card home">
          <Image
            src="/images/mahavir-card-logo.jpeg"
            alt=""
            width={40}
            height={40}
            priority
            className="size-10 rounded-full object-cover ring-1 ring-[var(--mc-line-strong)] transition group-hover:ring-[var(--mc-accent)]"
          />
          <span className="flex flex-col leading-none">
            <span className="mc-display text-[19px] font-semibold text-[var(--mc-ink)]">Mahavir Card</span>
            <span className="mc-ticket mt-1 text-[var(--mc-faint)]">Est. Ahmedabad</span>
          </span>
        </Link>

        <form
          action="/catalog"
          className="hidden min-w-0 max-w-xl flex-1 items-center border border-[var(--mc-line-strong)] bg-[var(--mc-paper)] px-3 transition focus-within:border-[var(--mc-ink)] md:flex"
        >
          <Search size={17} className="text-[var(--mc-faint)]" />
          <input
            name="q"
            placeholder="Search business cards, boxes, labels..."
            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-[var(--mc-faint)]"
          />
          <span className="mc-ticket border-l border-[var(--mc-line)] py-1 pl-3 text-[var(--mc-faint)]">Find</span>
        </form>

        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/login"
            className="flex items-center gap-2 px-2 py-2 text-[var(--mc-ink-soft)] transition-colors hover:text-[var(--mc-accent)]"
          >
            <UserRound size={17} /> <span className="hidden sm:inline">Account</span>
          </Link>
          <Link
            href="/cart"
            className="grid size-9 place-items-center border border-[var(--mc-line-strong)] bg-[var(--mc-paper)] text-[var(--mc-ink)] transition hover:border-[var(--mc-ink)] hover:bg-[var(--mc-ink)] hover:text-white"
            aria-label="Purchase basket"
          >
            <ShoppingBag size={17} />
          </Link>
          <Link
            href="/quote"
            className="mc-wipe hidden items-center gap-2 border border-[var(--mc-accent)] bg-[var(--mc-accent)] px-3.5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-[var(--mc-ink)] sm:flex"
          >
            <FileText size={16} /> Quote basket
          </Link>
        </div>
      </div>

      <nav
        className="mx-auto flex max-w-[1440px] gap-6 overflow-x-auto px-4 pb-3 text-[13px] font-medium text-[var(--mc-muted)] lg:px-8"
        aria-label="Product categories"
      >
        {categoryLinks.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="mc-rule-in relative whitespace-nowrap py-0.5 transition-colors hover:text-[var(--mc-ink)]"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
