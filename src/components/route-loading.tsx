import { Loader2 } from "lucide-react";

export function RouteLoading() {
  return (
    <div className="mc-storefront flex min-h-screen items-center justify-center bg-[var(--mc-surface)]">
      <Loader2 size={28} className="animate-spin text-[var(--mc-accent)]" />
    </div>
  );
}
