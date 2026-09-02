"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton({
  fallbackHref = "/products",
  label = "Back to products",
  className = "inline-flex items-center gap-2 text-[15px] font-semibold text-[var(--mc-muted)] hover:text-[var(--mc-accent)] transition-colors",
}: {
  fallbackHref?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        // Prefer real browser back navigation so Next.js restores the previous
        // page's cached scroll position and filters; a forward push to
        // fallbackHref remounts the listing at the top of the page instead.
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
      className={className}
      aria-label={label}
    >
      <ArrowLeft size={17} />
      <span>{label}</span>
    </button>
  );
}
