import type { ReactNode } from "react";

/**
 * COPY PLACEHOLDER — editorial content block for a category landing page.
 *
 * To supply copy for a category, add an entry to `categoryCopy` in
 * `src/content/category-copy.tsx` keyed by the category's public path
 * (e.g. "visiting-card-printing-ahmedabad"). Each entry is plain props:
 * `intro` (a short paragraph) and optional `sections` (heading + body,
 * where body can be a string or JSX). No component changes are needed.
 *
 * Until copy is supplied the block renders nothing, so the page still
 * ships a real H1, product grid and metadata for crawlers.
 */
export type CategoryCopySection = { heading: string; body: ReactNode };
export type CategoryCopyProps = { intro?: ReactNode; sections?: CategoryCopySection[] };

export function CategoryCopy({ intro, sections }: CategoryCopyProps) {
  if (!intro && !sections?.length) return null;
  return (
    <section aria-label="About this product range" className="mt-10 max-w-3xl space-y-8 text-[15px] leading-7 text-[var(--mc-muted)]">
      {intro ? <div className="text-base leading-7 text-[var(--mc-ink)]">{typeof intro === "string" ? <p>{intro}</p> : intro}</div> : null}
      {sections?.map((section) => (
        <div key={section.heading}>
          <h2 className="text-xl font-bold text-[var(--mc-ink)]">{section.heading}</h2>
          <div className="mt-2">{typeof section.body === "string" ? <p>{section.body}</p> : section.body}</div>
        </div>
      ))}
    </section>
  );
}
