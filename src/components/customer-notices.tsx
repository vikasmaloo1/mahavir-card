"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

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
  const [animationDurationSeconds, setAnimationDurationSeconds] = useState(90);
  const sequenceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/notices?placement=" + placement, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (active && payload.success && Array.isArray(payload.data)) setItems(payload.data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [placement]);

  const displayItems = useMemo(() => {
    const priorityWeight = { HIGH: 0, NORMAL: 1, LOW: 2 };
    const seen = new Set<string>();
    return items
      .filter((item) => {
        const key = item.title.trim().toLowerCase() + "|" + (item.message || "").trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => {
        const priorityDifference = priorityWeight[a.priority || "NORMAL"] - priorityWeight[b.priority || "NORMAL"];
        return priorityDifference || (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      });
  }, [items]);

  const staticNotice = displayItems.find((item) => item.animationType === "STATIC");
  const marqueeItems = staticNotice ? [] : displayItems;

  useEffect(() => {
    if (!sequenceRef.current || !marqueeItems.length) return;

    const updateDuration = (width: number) => {
      const pixelsPerSecond = window.innerWidth < 640 ? 45 : 45;
      setAnimationDurationSeconds(Math.max(60, Math.ceil(width / pixelsPerSecond)));
    };
    const observer = new ResizeObserver(([entry]) => updateDuration(entry.contentRect.width));
    observer.observe(sequenceRef.current);
    updateDuration(sequenceRef.current.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, [marqueeItems.length]);

  if (!loaded || !displayItems.length) return null;

  return (
    <aside className="customer-notice-strip relative z-20 w-full overflow-hidden border-b border-[#c7d4e7] bg-[#f7faff] text-[var(--mc-ink)] shadow-[0_2px_8px_rgba(25,55,105,0.06)]" aria-label="Customer announcements">
      {staticNotice ? (
        <div className="ticker-static flex h-full min-w-0 items-center justify-center overflow-hidden whitespace-nowrap px-4">
          <NoticeTickerItem item={staticNotice} staticMode />
        </div>
      ) : (
        <div className="flex h-full w-full items-center overflow-hidden">
          <div
            className="animate-ticker-continuous flex shrink-0 items-center whitespace-nowrap"
            style={{ "--ticker-duration": animationDurationSeconds + "s" } as CSSProperties}
          >
            <div ref={sequenceRef} className="ticker-sequence flex shrink-0 items-center">
              {marqueeItems.map((item) => <NoticeTickerItem key={"track1-" + item.id} item={item} />)}
            </div>
            <div className="ticker-sequence flex shrink-0 items-center" aria-hidden="true">
              {marqueeItems.map((item) => <NoticeTickerItem key={"track2-" + item.id} item={item} ariaHidden />)}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function NoticeTickerItem({ item, ariaHidden, staticMode = false }: { item: CustomerNoticeItem; ariaHidden?: boolean; staticMode?: boolean }) {
  const markerColor = item.tone === "WARNING" ? "bg-[#526b91]" : item.tone === "SUCCESS" ? "bg-[#2f7668]" : "bg-[#2b65c8]";

  return (
    <span className={"ticker-notice inline-flex min-w-0 items-center " + (staticMode ? "max-w-full" : "")} aria-hidden={ariaHidden}>
      <span className={"ticker-marker mr-3 size-2 shrink-0 rotate-45 " + markerColor} aria-hidden="true" />
      {item.title?.trim() ? <span className="ticker-title shrink-0 font-extrabold uppercase text-[#10213f]">{item.title}</span> : null}
      {item.message?.trim() ? <span className="ticker-message ml-3 min-w-0 font-medium text-[#4d5f7c]">{item.message}</span> : null}
      {item.linkLabel && item.linkUrl ? (
        <Link href={item.linkUrl} tabIndex={ariaHidden ? -1 : 0} className="ticker-cta ml-4 inline-flex shrink-0 items-center gap-1.5 border-b border-[#7da2e8] pb-0.5 font-bold text-[#2457b8] transition-colors hover:border-[#163f8f] hover:text-[#163f8f]">
          <span>{item.linkLabel}</span>
          <span aria-hidden="true">&rarr;</span>
        </Link>
      ) : null}
      {!staticMode ? <span className="ticker-separator mx-8 shrink-0 text-lg font-bold text-[#9badc7] sm:mx-12 lg:mx-14" aria-hidden="true">{"\u00b7"}</span> : null}
    </span>
  );
}
