"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

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

  function handleClick() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <button type="button" onClick={handleClick} className={className} aria-label={label}>
      <ArrowLeft size={17} />
      <span>{label}</span>
    </button>
  );
}
