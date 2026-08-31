"use client";

import Link from "next/link";
import { ArrowRight, CircleAlert, Info, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type CustomerNoticeItem = {
  id: string;
  title: string;
  message: string;
  tone: "INFO" | "WARNING" | "SUCCESS";
  placement: "GLOBAL" | "HOME" | "ORDERING";
  animationType?: "MARQUEE" | "STATIC";
  priority?: "HIGH" | "NORMAL" | "LOW";
  linkLabel: string | null;
  linkUrl: string | null;
  sortOrder?: number;
};

export function CustomerNotices({ placement = "GLOBAL" }: { placement?: "GLOBAL" | "HOME" | "ORDERING" }) {
  const [items, setItems] = useState<CustomerNoticeItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/notices?placement=${placement}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        if (active && payload.success && Array.isArray(payload.data)) {
          setItems(payload.data);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [placement]);

  const isStatic = useMemo(() => {
    return items.length > 0 && items.every((item) => item.animationType === "STATIC");
  }, [items]);

  if (!loaded || !items.length) return null;

  // Single static notice layout if all are static or only 1 static
  if (isStatic) {
    return (
      <aside
        className="relative z-20 border-b border-[#d7e1f2] bg-[#f5f8ff] text-[var(--mc-ink)]"
        aria-label="Important notices"
      >
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          {items.map((item) => {
            const Icon = item.tone === "WARNING" ? CircleAlert : item.tone === "SUCCESS" ? ShieldCheck : Info;
            return (
              <div key={item.id} className="flex items-center gap-2.5 text-xs sm:text-sm">
                <span
                  className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full ${
                    item.tone === "WARNING"
                      ? "bg-[#fff2e0] text-[#9c5b16]"
                      : item.tone === "SUCCESS"
                      ? "bg-[#eaf6ed] text-[#1c693a]"
                      : "bg-[#eaf1ff] text-[var(--mc-accent)]"
                  }`}
                >
                  <Icon size={13} />
                </span>
                <span className="font-semibold text-[var(--mc-ink)]">{item.title}</span>
                <span className="hidden text-[var(--mc-muted)] md:inline">{item.message}</span>
                {item.linkLabel && item.linkUrl ? (
                  <Link
                    href={item.linkUrl}
                    className="ml-2 inline-flex items-center gap-1 font-bold text-[var(--mc-accent)] hover:underline"
                  >
                    {item.linkLabel}
                    <ArrowRight size={13} />
                  </Link>
                ) : null}
              </div>
            );
          })}
        </div>
      </aside>
    );
  }

  // Continuous moving notice ticker
  return (
    <aside
      className="group relative z-20 overflow-hidden border-b border-[#d7e1f2] bg-[#f5f8ff] py-2 text-xs sm:text-[13px] text-[var(--mc-ink)]"
      aria-label="Continuous announcement ticker"
    >
      <div className="flex w-full overflow-hidden">
        <div className="animate-ticker-continuous flex shrink-0 items-center">
          {/* First set of notices */}
          {items.map((item) => (
            <NoticeTickerItem key={`first-${item.id}`} item={item} />
          ))}
          {/* Duplicate set for seamless infinite looping without gaps */}
          {items.map((item) => (
            <NoticeTickerItem key={`second-${item.id}`} item={item} ariaHidden />
          ))}
        </div>
      </div>
    </aside>
  );
}

function NoticeTickerItem({ item, ariaHidden }: { item: CustomerNoticeItem; ariaHidden?: boolean }) {
  const Icon = item.tone === "WARNING" ? CircleAlert : item.tone === "SUCCESS" ? ShieldCheck : Info;

  return (
    <div
      className="flex shrink-0 items-center gap-2.5 px-6"
      aria-hidden={ariaHidden}
    >
      <span
        className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full ${
          item.tone === "WARNING"
            ? "bg-[#fff2e0] text-[#9c5b16]"
            : item.tone === "SUCCESS"
            ? "bg-[#eaf6ed] text-[#1c693a]"
            : "bg-[#eaf1ff] text-[var(--mc-accent)]"
        }`}
      >
        <Icon size={13} />
      </span>

      <strong className="whitespace-nowrap font-bold text-[var(--mc-ink)]">
        {item.title}
      </strong>

      {item.message ? (
        <span className="whitespace-nowrap text-[var(--mc-muted)] font-normal">
          {item.message}
        </span>
      ) : null}

      {item.linkLabel && item.linkUrl ? (
        <Link
          href={item.linkUrl}
          tabIndex={ariaHidden ? -1 : 0}
          className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-full border border-[#c7d7f3] bg-white px-2.5 py-0.5 text-xs font-bold text-[var(--mc-accent)] hover:border-[var(--mc-accent)] hover:bg-[var(--mc-accent-soft)]"
        >
          <span>{item.linkLabel}</span>
          <ArrowRight size={11} />
        </Link>
      ) : null}

      <span className="mx-2 text-[#9bb0ce] select-none" aria-hidden="true">
        {"\u2022"}
      </span>
    </div>
  );
}
