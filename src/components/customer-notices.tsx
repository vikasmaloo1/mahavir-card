"use client";

import Link from "next/link";
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

  // Clean deduplication and priority ordering
  const displayItems = useMemo(() => {
    const priorityWeight = { HIGH: 0, NORMAL: 1, LOW: 2 };
    const seen = new Set<string>();

    const unique = items.filter((item) => {
      const key = `${item.title.trim().toLowerCase()}|${(item.message || "").trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique.sort((a, b) => {
      const pA = priorityWeight[a.priority || "NORMAL"];
      const pB = priorityWeight[b.priority || "NORMAL"];
      if (pA !== pB) return pA - pB;
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });
  }, [items]);

  // Reading pace: 60 seconds per loop cycle
  const animationDurationSeconds = useMemo(() => {
    return 60;
  }, []);

  if (!loaded || !displayItems.length) return null;

  return (
    <aside
      className="group relative z-20 h-12 sm:h-[50px] w-full overflow-hidden border-b border-[#d4deeb] bg-[#f4f7fc] text-[var(--mc-ink)] select-none shadow-[0_1px_2px_rgba(16,33,63,0.03)]"
      aria-label="Announcements and Customer Notices"
    >
      <div className="flex h-full w-full items-center overflow-hidden">
        <div
          className="animate-ticker-continuous flex shrink-0 items-center whitespace-nowrap text-[14px] sm:text-[15.5px] text-[#0f213d]"
          style={{ animationDuration: `${animationDurationSeconds}s` }}
        >
          {/* First sequence of notices */}
          {displayItems.map((item) => (
            <NoticeTickerItem key={`track1-${item.id}`} item={item} />
          ))}
          {/* Second duplicate sequence for seamless 100% infinite continuous loop */}
          {displayItems.map((item) => (
            <NoticeTickerItem key={`track2-${item.id}`} item={item} ariaHidden />
          ))}
        </div>
      </div>
    </aside>
  );
}

function NoticeTickerItem({ item, ariaHidden }: { item: CustomerNoticeItem; ariaHidden?: boolean }) {
  return (
    <span className="inline-flex items-center px-4 sm:px-6" aria-hidden={ariaHidden}>
      {/* Subtle indicator bullet */}
      <span
        className={`size-2 mr-2.5 shrink-0 rounded-full ${
          item.tone === "WARNING"
            ? "bg-[#d97706]"
            : item.tone === "SUCCESS"
            ? "bg-[#16a34a]"
            : "bg-[#2864dc]"
        }`}
        aria-hidden="true"
      />

      {/* Notice Title */}
      <span className="font-semibold text-[#0f213d] tracking-normal">
        {item.title}
      </span>

      {/* Notice Message / Detail */}
      {item.message ? (
        <span className="font-normal text-[#4c5f7a] ml-1.5">
          {item.message}
        </span>
      ) : null}

      {/* Inline CTA Action */}
      {item.linkLabel && item.linkUrl ? (
        <Link
          href={item.linkUrl}
          tabIndex={ariaHidden ? -1 : 0}
          className="ml-2 inline-flex items-center gap-0.5 font-semibold text-[#2457b8] hover:underline"
        >
          <span>{item.linkLabel}</span>
          <span aria-hidden="true">&rarr;</span>
        </Link>
      ) : null}

      {/* Single clean separator between notices */}
      <span className="ml-8 sm:ml-12 text-[#9bb0ce] select-none text-base" aria-hidden="true">
        {"\u00b7"}
      </span>
    </span>
  );
}
