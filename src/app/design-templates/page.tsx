import type { Metadata } from "next";

import { DesignTemplatesGallery } from "@/components/design-templates-gallery";
import { StorefrontFooter } from "@/components/storefront-footer";
import { StorefrontHeader } from "@/components/storefront-header";

export const metadata: Metadata = {
  title: "Free Design Templates",
  description: "Browse free, licensed design templates for visiting cards, brochures, stickers and more — use one as a starting point for your print order.",
};

export default function DesignTemplatesPage() {
  return (
    <div className="mc-storefront">
      <StorefrontHeader />
      <DesignTemplatesGallery />
      <StorefrontFooter />
    </div>
  );
}
