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
      const pixelsPerSecond = 36;
      setAnimationDurationSeconds(Math.max(60, Math.ceil(width / pixelsPerSecond)));
    };
    const observer = new ResizeObserver(([entry]) => updateDuration(entry.contentRect.width));
    observer.observe(sequenceRef.current);
    updateDuration(sequenceRef.current.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, [marqueeItems.length]);

  if (!loaded || !displayItems.length) return null;

  return (
    <aside className="customer-notice-strip relative z-20 w-full overflow-hidden border-b border-slate-200/80 bg-white py-2 text-slate-800 shadow-xs" aria-label="Customer announcements">
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
  const markerColor = item.tone === "WARNING" ? "bg-amber-600" : item.tone === "SUCCESS" ? "bg-emerald-600" : "bg-[#1e3a5f]";

  return (
    <span className={"ticker-notice inline-flex min-w-0 items-center text-sm sm:text-base " + (staticMode ? "max-w-full" : "")} aria-hidden={ariaHidden}>
      <span className={"ticker-marker mr-2.5 size-1.5 shrink-0 rotate-45 " + markerColor} aria-hidden="true" />
      {item.title?.trim() ? <span className="ticker-title shrink-0 font-bold uppercase tracking-wider text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-800">{item.title}</span> : null}
      {item.message?.trim() ? <span className="ticker-message ml-2.5 min-w-0 font-normal text-slate-700 text-sm sm:text-[15px]">{item.message}</span> : null}
      {item.linkLabel && item.linkUrl ? (
        <Link href={item.linkUrl} tabIndex={ariaHidden ? -1 : 0} className="ticker-cta ml-3 inline-flex shrink-0 items-center gap-1 font-bold text-[#1e3a5f] hover:underline text-xs sm:text-sm">
          <span>{item.linkLabel}</span>
          <span aria-hidden="true">&rarr;</span>
        </Link>
      ) : null}
      {!staticMode ? <span className="ticker-separator mx-6 shrink-0 text-slate-300 font-bold sm:mx-10" aria-hidden="true">{"\u00b7"}</span> : null}
    </span>
  );
}
