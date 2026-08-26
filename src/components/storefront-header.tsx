import Link from "next/link";
import Image from "next/image";
import { FileText, Search, ShoppingBag, UserRound } from "lucide-react";

export function StorefrontHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#d8d6cf] bg-[#fcfbf8]/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-3 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Mahavir Card home">
          <Image src="/images/mahavir-card-logo.jpeg" alt="" width={40} height={40} priority className="size-10 rounded-full object-cover" />
          <span className="text-base font-bold text-[#17221c]">Mahavir Card</span>
        </Link>
        <form action="/catalog" className="hidden min-w-0 max-w-xl flex-1 items-center border border-[#d7d5ce] bg-white px-3 md:flex">
          <Search size={17} className="text-[#777a74]" />
          <input name="q" placeholder="Search business cards, boxes, labels..." className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-[#999b95]" />
          <span className="border-l border-[#e5e2db] pl-3 text-[11px] uppercase tracking-[0.12em] text-[#999b95]">Find</span>
        </form>
        <div className="flex items-center gap-2 text-sm">
          <Link href="/login" className="flex items-center gap-2 px-2 py-2 text-[#4b514c] hover:text-[#8b2f24]"><UserRound size={17} /> <span className="hidden sm:inline">Account</span></Link>
          <Link href="/cart" className="grid size-9 place-items-center border border-[#d7d5ce] bg-white text-[#243027] hover:border-[#243027]" aria-label="Purchase basket"><ShoppingBag size={17} /></Link>
          <Link href="/quote" className="hidden items-center gap-2 bg-[#17221c] px-3 py-2.5 font-semibold text-white hover:bg-[#8b2f24] sm:flex"><FileText size={16} /> Quote basket</Link>
        </div>
      </div>
      <nav className="mx-auto flex max-w-[1440px] gap-6 overflow-x-auto px-4 pb-3 text-[13px] font-medium text-[#505951] lg:px-8" aria-label="Product categories">
        <Link href="/catalog" className="whitespace-nowrap hover:text-[#8b2f24]">All products</Link>
        <Link href="/catalog?category=printing" className="whitespace-nowrap hover:text-[#8b2f24]">Printing</Link>
        <Link href="/catalog?category=packaging" className="whitespace-nowrap hover:text-[#8b2f24]">Packaging</Link>
        <Link href="/catalog?category=labels-stickers" className="whitespace-nowrap hover:text-[#8b2f24]">Labels & stickers</Link>
        <Link href="/catalog?category=stationery" className="whitespace-nowrap hover:text-[#8b2f24]">Stationery</Link>
        <Link href="/catalog?category=branding-signage" className="whitespace-nowrap hover:text-[#8b2f24]">Branding & signage</Link>
        <Link href="/catalog?category=corporate-gifting" className="whitespace-nowrap hover:text-[#8b2f24]">Corporate gifting</Link>
      </nav>
    </header>
  );
}
