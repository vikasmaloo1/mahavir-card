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
      className="group relative z-20 h-[46px] sm:h-[50px] md:h-[52px] w-full overflow-hidden border-b border-[#cbd5e1] bg-[#f8fafc] text-[var(--mc-ink)] select-none shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
      aria-label="Announcements and Customer Notices"
    >
      <div className="flex h-full w-full items-center overflow-hidden">
        <div
          className="animate-ticker-continuous flex shrink-0 items-center whitespace-nowrap text-[15px] sm:text-[16.5px] md:text-[17px] tracking-tight"
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
  const hasTitle = Boolean(item.title?.trim());
  const hasMessage = Boolean(item.message?.trim());
  const messageStartsWithDash = item.message?.trim().startsWith("—") || item.message?.trim().startsWith("-");

  return (
    <span className="inline-flex items-center" aria-hidden={ariaHidden}>
      {/* Subtle accent indicator bullet */}
      <span
        className={`size-2 sm:size-2.5 mr-2.5 shrink-0 rounded-full ${
          item.tone === "WARNING"
            ? "bg-[#d97706]"
            : item.tone === "SUCCESS"
            ? "bg-[#16a34a]"
            : "bg-[#2563eb]"
        }`}
        aria-hidden="true"
      />

      {/* Notice Title (Bold / Semibold with High Contrast) */}
      {hasTitle ? (
        <span className="font-bold text-[#0f172a]">
          {item.title}
        </span>
      ) : null}

      {/* Notice Message / Supporting Text (Medium Weight) */}
      {hasMessage ? (
        <span className="font-medium text-[#334155] ml-1.5">
          {hasTitle && !messageStartsWithDash ? `— ${item.message}` : item.message}
        </span>
      ) : null}

      {/* Inline CTA Action */}
      {item.linkLabel && item.linkUrl ? (
        <Link
          href={item.linkUrl}
          tabIndex={ariaHidden ? -1 : 0}
          className="ml-2.5 inline-flex items-center gap-1 font-semibold text-[#1d4ed8] hover:text-[#1e40af] hover:underline"
        >
          <span>{item.linkLabel}</span>
          <span aria-hidden="true">&rarr;</span>
        </Link>
      ) : null}

      {/* Single clean separator between notices */}
      <span className="mx-6 sm:mx-8 text-base sm:text-lg font-bold text-[#94a3b8] select-none" aria-hidden="true">
        {"\u00b7"}
      </span>
    </span>
  );
}
