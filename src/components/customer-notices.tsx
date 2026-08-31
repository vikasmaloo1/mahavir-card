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
      className="group relative z-20 h-9 sm:h-10 w-full overflow-hidden border-b border-[#d7e1f2] bg-[#f0f4fa] text-[var(--mc-ink)] select-none"
      aria-label="Important notices ticker"
    >
      <div className="flex h-full w-full items-center overflow-hidden">
        <div className="animate-ticker-continuous flex shrink-0 items-center whitespace-nowrap text-xs sm:text-[13px] text-[#10213f]">
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
    <span className="inline-flex items-center gap-2 px-5 sm:px-6" aria-hidden={ariaHidden}>
      {/* Subtle indicator dot */}
      <span
        className={`size-1.5 shrink-0 rounded-full ${
          item.tone === "WARNING"
            ? "bg-[#d97706]"
            : item.tone === "SUCCESS"
            ? "bg-[#16a34a]"
            : "bg-[var(--mc-accent)]"
        }`}
        aria-hidden="true"
      />

      {/* Notice Title */}
      <strong className="font-bold text-[#10213f]">{item.title}</strong>

      {/* Notice Message (Short) */}
      {item.message ? (
        <span className="font-normal text-[#5d6f8d]">
          {item.message}
        </span>
      ) : null}

      {/* Inline CTA Action Link */}
      {item.linkLabel && item.linkUrl ? (
        <Link
          href={item.linkUrl}
          tabIndex={ariaHidden ? -1 : 0}
          className="ml-1.5 inline-flex items-center gap-0.5 font-bold text-[var(--mc-accent)] hover:underline"
        >
          <span>{item.linkLabel}</span>
          <span aria-hidden="true">&rarr;</span>
        </Link>
      ) : null}

      {/* Subtle dot divider */}
      <span className="ml-5 sm:ml-6 text-[#9bb0ce] select-none" aria-hidden="true">
        {"\u00b7"}
      </span>
    </span>
  );
}
