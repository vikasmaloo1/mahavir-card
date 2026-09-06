"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";

type Notification = { id: string; event: string; subject: string; body: string; status: string; createdAt: string };

export function AccountNotifications() {
  const [items, setItems] = useState<Notification[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/account/notifications", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => { if (active && payload?.success) setItems(payload.data.items); })
      .catch(() => { if (active) setError("Could not load your notifications."); });
    return () => { active = false; };
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      <p className="text-xs font-bold uppercase text-[var(--mc-accent)]">Account</p>
      <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold sm:text-3xl"><Bell size={24} />Notifications</h1>
      <p className="mt-2 text-sm text-[var(--mc-muted)]">Updates about your quotes, orders, and payments.</p>
      {error ? <p role="alert" className="mt-6 rounded-lg border border-[#efb7b7] bg-[#fff4f4] p-3 text-sm font-semibold text-[#9b2525]">{error}</p> : null}
      {items === null && !error ? <p className="mt-6 text-sm text-[var(--mc-muted)]">Loading...</p> : null}
      {items?.length === 0 ? <p className="mt-6 rounded-xl border border-dashed border-[var(--mc-line)] p-6 text-sm text-[var(--mc-muted)]">No notifications yet.</p> : null}
      <div className="mt-6 space-y-3">
        {items?.map((item) => (
          <div key={item.id} className="rounded-xl border border-[var(--mc-line)] bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <strong className="text-sm text-[var(--mc-ink)]">{item.subject}</strong>
              <time className="shrink-0 text-xs text-[var(--mc-muted)]">{new Date(item.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</time>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm text-[var(--mc-muted)]">{item.body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
