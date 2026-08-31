"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

  if (!loaded || !items.length) return null;

  return (
    <aside
      className="group relative z-20 h-11 sm:h-12 w-full overflow-hidden border-b border-[#d2ddee] bg-[#f4f7fc] text-[var(--mc-ink)] select-none shadow-[0_1px_2px_rgba(16,33,63,0.02)]"
      aria-label="Announcements & Print Guidelines"
    >
      <div className="flex h-full w-full items-center overflow-hidden">
        <div className="animate-ticker-continuous flex shrink-0 items-center whitespace-nowrap text-[13.5px] sm:text-[14px] text-[#0f213d]">
          {/* First set of notices */}
          {items.map((item) => (
            <NoticeTickerItem key={`track1-${item.id}`} item={item} />
          ))}
          {/* Second duplicate set for seamless infinite loop */}
          {items.map((item) => (
            <NoticeTickerItem key={`track2-${item.id}`} item={item} ariaHidden />
          ))}
        </div>
      </div>
    </aside>
  );
}

function NoticeTickerItem({ item, ariaHidden }: { item: CustomerNoticeItem; ariaHidden?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 px-6 sm:px-8" aria-hidden={ariaHidden}>
      {/* Subtle indicator dot/pill */}
      <span
        className={`size-2 shrink-0 rounded-full ${
          item.tone === "WARNING"
            ? "bg-[#d97706]"
            : item.tone === "SUCCESS"
            ? "bg-[#16a34a]"
            : "bg-[#2864dc]"
        }`}
        aria-hidden="true"
      />

      {/* Notice Title */}
      <strong className="font-semibold text-[#0f213d] tracking-normal">
        {item.title}
      </strong>

      {/* Notice Short Message / Detail */}
      {item.message ? (
        <span className="font-normal text-[#526685]">
          {item.message}
        </span>
      ) : null}

      {/* Inline CTA Link */}
      {item.linkLabel && item.linkUrl ? (
        <Link
          href={item.linkUrl}
          tabIndex={ariaHidden ? -1 : 0}
          className="ml-1.5 inline-flex items-center gap-1 font-bold text-[#2864dc] hover:underline"
        >
          <span>{item.linkLabel}</span>
          <span aria-hidden="true">&rarr;</span>
        </Link>
      ) : null}

      {/* Subtle divider */}
      <span className="ml-6 sm:ml-8 text-[#9cb0ce] select-none" aria-hidden="true">
        {"\u00b7"}
      </span>
    </span>
  );
}
