"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MessageCircleQuestion, X } from "lucide-react";

import { guidedAssistantMessageFor, type GuidedAssistantMessage } from "@/lib/guided-assistant-messages";

const IDLE_DELAY_MS = 8000;
const DISMISS_KEY = "mc-guided-assistant-dismissed";
const HIDDEN_PREFIXES = ["/admin", "/login", "/checkout", "/cart", "/api"];

export function GuidedAssistant() {
  const pathname = usePathname();
  const message = guidedAssistantMessageFor(pathname);
  const isHiddenRoute = HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!message || isHiddenRoute) return null;

  // Keying by pathname remounts this on route change, so idle/visibility
  // state resets naturally instead of needing a manual reset inside an effect.
  return <GuidedAssistantCard key={pathname} message={message} />;
}

function GuidedAssistantCard({ message }: { message: GuidedAssistantMessage }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      dismissed = false;
    }
    if (dismissed) return;

    function scheduleIdleShow() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(true), IDLE_DELAY_MS);
    }

    function handleActivity() {
      setVisible(false);
      scheduleIdleShow();
    }

    const events: (keyof WindowEventMap)[] = ["mousemove", "keydown", "scroll", "touchstart", "click"];
    events.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }));
    scheduleIdleShow();

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Ignore storage failures (private browsing, etc.) — dismissal just won't persist.
    }
  }

  if (!visible) return null;

  return (
    <div
      role="complementary"
      aria-label="Suggested next step"
      className="fixed inset-x-3 bottom-3 z-40 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:max-w-sm"
    >
      <div className="relative rounded-2xl border border-[var(--mc-line)] bg-white p-4 shadow-xl sm:p-5">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Not now"
          className="absolute right-3 top-3 grid size-7 place-items-center rounded-full text-[var(--mc-muted)] hover:bg-[var(--mc-accent-soft)] hover:text-[var(--mc-ink)] transition-colors"
        >
          <X size={15} />
        </button>
        <div className="flex items-start gap-3 pr-6">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--mc-accent-soft)] text-[var(--mc-accent)]">
            <MessageCircleQuestion size={18} />
          </span>
          <div>
            <p className="text-sm font-bold text-[var(--mc-ink)]">{message.heading}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--mc-muted)]">{message.body}</p>
          </div>
        </div>
        <div className="mt-3.5 flex flex-wrap items-center gap-2 pl-12">
          <Link
            href={message.primary.href}
            onClick={dismiss}
            className="inline-flex items-center rounded-full bg-[var(--mc-accent)] px-4 py-2 text-xs font-bold text-white transition hover:bg-[var(--mc-accent-dark)]"
          >
            {message.primary.label}
          </Link>
          {message.secondary ? (
            <Link
              href={message.secondary.href}
              onClick={dismiss}
              className="inline-flex items-center rounded-full border border-[var(--mc-line)] px-4 py-2 text-xs font-bold text-[var(--mc-ink)] transition hover:border-[var(--mc-accent)] hover:text-[var(--mc-accent)]"
            >
              {message.secondary.label}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={dismiss}
            className="ml-auto text-xs font-semibold text-[var(--mc-muted)] hover:text-[var(--mc-ink)] transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
