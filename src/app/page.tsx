import {
  ArrowUpRight,
  BadgeCheck,
  Box,
  ChevronRight,
  CircleCheck,
  Layers3,
  PackageCheck,
  Palette,
  Printer,
  Sparkles,
} from "lucide-react";

const services = [
  [Palette, "Printing", "Business cards, brochures, menus, and stationery with a finish that feels right."],
  [Box, "Packaging", "Retail boxes, sleeves, and bags that make the unboxing part of your story."],
  [Layers3, "Labels", "Clean, durable labels for products, shipping, and everything in between."],
  [Sparkles, "Branding", "Consistent collateral that helps your team look ready at every touchpoint."],
  [PackageCheck, "Corporate gifting", "Useful, well-presented gifts that people want to keep and use."],
  [Printer, "Custom projects", "Have an unusual brief? Bring it over. We will work out the best route."],
] as const;

const steps = [
  ["01", "Tell us what you need", "Share the format, quantity, timeline, and any reference you have."],
  ["02", "Get a clear quote", "We recommend the right material and send an estimate you can act on."],
  ["03", "Approve and receive", "Once approved, we handle production and keep you updated."],
] as const;

export default function Home() {
  return (
    <main className="bg-[#f7f4ee] text-[#17211c]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <a href="#top" className="flex items-center gap-3" aria-label="Mahavir Card home"><span className="grid size-10 place-items-center bg-[#e94f37] text-white"><Printer size={21} /></span><span className="text-lg font-semibold tracking-tight">Mahavir Card</span></a>
        <nav className="hidden items-center gap-8 text-sm font-medium md:flex" aria-label="Main navigation"><a href="#services" className="hover:text-[#e94f37]">Services</a><a href="#process" className="hover:text-[#e94f37]">How it works</a><a href="#contact" className="hover:text-[#e94f37]">Contact</a></nav>
        <a href="#contact" className="flex items-center gap-2 bg-[#17211c] px-4 py-3 text-sm font-semibold text-white hover:bg-[#e94f37]">Start a project <ArrowUpRight size={16} /></a>
      </header>

      <section id="top" className="mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-10 lg:pb-28 lg:pt-20">
        <div><div className="mb-7 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#e94f37]"><Sparkles size={16} /> Made for your next impression</div><h1 className="max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.04em] sm:text-7xl">Mahavir Card</h1><p className="mt-7 max-w-xl text-lg leading-8 text-[#526058] sm:text-xl">Thoughtful printing and packaging for businesses that care how they show up.</p><div className="mt-9 flex flex-wrap gap-4"><a href="#contact" className="flex items-center gap-2 bg-[#e94f37] px-5 py-3.5 font-semibold text-white hover:-translate-y-0.5">Get a quote <ArrowUpRight size={18} /></a><a href="#services" className="flex items-center gap-2 border border-[#cbd0c9] px-5 py-3.5 font-semibold hover:border-[#17211c]">Explore services <ChevronRight size={18} /></a></div><div className="mt-12 flex flex-wrap gap-x-8 gap-y-4 text-sm text-[#526058]"><span className="flex items-center gap-2"><CircleCheck size={17} className="text-[#2b8a68]" /> Business-ready quality</span><span className="flex items-center gap-2"><CircleCheck size={17} className="text-[#2b8a68]" /> Clear, quick estimates</span></div></div>
        <div className="relative min-h-[390px] overflow-hidden bg-[#dce8dc] p-6 sm:min-h-[510px] sm:p-10"><div className="absolute right-8 top-8 text-xs font-semibold uppercase tracking-[0.2em] text-[#2b8a68]">Print studio / 01</div><div className="absolute bottom-10 left-8 right-8 top-20 border border-[#2b8a68]/30 bg-[#f7f4ee] p-5 shadow-[14px_14px_0_#e94f37] sm:left-16 sm:right-16 sm:top-24 sm:p-8"><div className="flex items-start justify-between border-b border-[#cbd0c9] pb-6"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e94f37]">Your brand, in hand</p><p className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Made to<br />be remembered.</p></div><BadgeCheck className="text-[#2b8a68]" size={30} /></div><div className="mt-8 grid grid-cols-2 gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#526058]"><div className="flex aspect-square items-end bg-[#17211c] p-3 text-white">Cards</div><div className="flex aspect-square items-end bg-[#e94f37] p-3 text-white">Labels</div><div className="flex aspect-square items-end bg-[#f1c453] p-3">Boxes</div><div className="flex aspect-square items-end bg-[#9dc8d2] p-3">Gifting</div></div></div></div>
      </section>

      <section id="services" className="border-y border-[#d9ddd5] bg-white"><div className="mx-auto max-w-7xl px-6 py-20 lg:px-10"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#e94f37]">What we make</p><h2 className="mt-3 max-w-xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">A sharper toolkit for your brand.</h2></div><p className="max-w-sm text-base leading-7 text-[#526058]">From a single premium card to a full campaign kit, every job gets practical guidance and careful finishing.</p></div><div className="mt-12 grid border-l border-t border-[#d9ddd5] sm:grid-cols-2 lg:grid-cols-3">{services.map(([Icon, title, text]) => <article key={title} className="border-b border-r border-[#d9ddd5] p-7 hover:bg-[#f7f4ee] sm:p-9"><Icon className="text-[#e94f37]" size={25} /><h3 className="mt-7 text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-7 text-[#526058]">{text}</p><a href="#contact" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold hover:text-[#e94f37]">Discuss a project <ArrowUpRight size={15} /></a></article>)}</div></div></section>

      <section id="process" className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[.8fr_1.2fr] lg:px-10 lg:py-28"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#e94f37]">The easy part</p><h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Good work, without the runaround.</h2></div><div className="grid gap-8 sm:grid-cols-3">{steps.map(([number, title, text]) => <div key={number} className="border-t-2 border-[#17211c] pt-5"><span className="text-sm font-semibold text-[#e94f37]">{number}</span><h3 className="mt-8 text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-7 text-[#526058]">{text}</p></div>)}</div></section>

      <section id="contact" className="bg-[#17211c] text-white"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-10 px-6 py-20 sm:flex-row sm:items-end lg:px-10 lg:py-24"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#f1c453]">Ready when you are</p><h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">Bring us the next thing your business needs to print.</h2></div><a href="mailto:hello@mahavircard.com" className="flex shrink-0 items-center gap-2 bg-[#e94f37] px-5 py-3.5 font-semibold hover:bg-[#f1c453] hover:text-[#17211c]">hello@mahavircard.com <ArrowUpRight size={18} /></a></div></section>
      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-7 text-sm text-[#526058] sm:flex-row sm:items-center sm:justify-between lg:px-10"><span>Copyright {new Date().getFullYear()} Mahavir Card</span><span>Print with purpose.</span></footer>
    </main>
  );
}
