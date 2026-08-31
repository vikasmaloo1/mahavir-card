"use client";

import Link from "next/link";
import { CircleAlert, Info, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

type Notice = { id: string; title: string; message: string; tone: "INFO" | "WARNING" | "SUCCESS"; linkLabel: string | null; linkUrl: string | null };

export function CustomerNotices({ placement }: { placement: "HOME" | "ORDERING" }) {
  const [items, setItems] = useState<Notice[]>([]);
  useEffect(() => {
    let active = true;
    fetch("/api/notices?placement=" + placement, { cache: "no-store" }).then((response) => response.json()).then((payload) => {
      if (active && payload.success) setItems(payload.data);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [placement]);
  if (!items.length) return null;
  return <div className="border-b border-[var(--mc-line)] bg-white"><div className="mx-auto max-w-[1440px] space-y-2 px-4 py-3 lg:px-8">{items.map((item) => {
    const Icon = item.tone === "WARNING" ? CircleAlert : item.tone === "SUCCESS" ? ShieldCheck : Info;
    return <div key={item.id} className="flex flex-col justify-between gap-2 text-sm sm:flex-row sm:items-center"><div className="flex items-start gap-2.5"><Icon size={17} className="mt-0.5 shrink-0 text-[var(--mc-accent)]" /><p><strong>{item.title}</strong><span className="ml-2 text-[var(--mc-muted)]">{item.message}</span></p></div>{item.linkLabel && item.linkUrl ? <Link href={item.linkUrl} className="shrink-0 font-bold text-[var(--mc-accent)]">{item.linkLabel}</Link> : null}</div>;
  })}</div></div>;
}
