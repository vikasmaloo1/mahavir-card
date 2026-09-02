import Link from "next/link";
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
  return (
    <Link href={fallbackHref} className={className} aria-label={label}>
      <ArrowLeft size={17} />
      <span>{label}</span>
    </Link>
  );
}
