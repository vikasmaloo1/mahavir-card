export type MappedItemArtwork = {
  id: string;
  fileName: string;
  fileSize?: number | null;
  status?: string;
  productId?: string | null;
};

export type ItemWithArtworks<TItem> = TItem & {
  artworks: MappedItemArtwork[];
};

export function mapItemsWithArtworks<
  TItem extends { id: string; productId?: string | null; configuration?: unknown; description?: string; jobName?: string | null },
  TArt extends { id: string; fileName: string; fileSize?: number | null; status?: string; productId?: string | null }
>(items: TItem[], artworks: TArt[]): { mappedItems: Array<TItem & { artworks: TArt[] }>; unmappedArtworks: TArt[] } {
  const artworkById = new Map(artworks.map((a) => [a.id, a]));
  const usedArtworkIds = new Set<string>();

  const mappedItems = items.map((item) => {
    const config = (item.configuration && typeof item.configuration === "object" ? item.configuration : {}) as Record<string, unknown>;
    const slotMap =
      config.artworkIds && typeof config.artworkIds === "object" && !Array.isArray(config.artworkIds)
        ? (config.artworkIds as Record<string, unknown>)
        : {};
    const legacyId = typeof config.artworkId === "string" ? config.artworkId : null;
    const explicitIds = [
      ...Object.values(slotMap).filter((v): v is string => typeof v === "string"),
      legacyId,
    ].filter(Boolean) as string[];

    let itemArtworks: TArt[] = [];
    if (explicitIds.length) {
      for (const id of explicitIds) {
        const art = artworkById.get(id);
        if (art) {
          itemArtworks.push(art);
          usedArtworkIds.add(id);
        }
      }
    }

    // Fallback 1: match by productId if any unused artwork matches this item's productId
    if (!itemArtworks.length && item.productId) {
      const productMatches = artworks.filter((a) => a.productId === item.productId && !usedArtworkIds.has(a.id));
      if (productMatches.length) {
        itemArtworks = productMatches;
        productMatches.forEach((a) => usedArtworkIds.add(a.id));
      }
    }

    return {
      ...item,
      artworks: itemArtworks,
    };
  });

  // If there is only 1 item and only 1 artwork, and it wasn't matched yet, associate them
  if (mappedItems.length === 1 && artworks.length === 1 && !mappedItems[0].artworks.length) {
    mappedItems[0].artworks = [artworks[0]];
    usedArtworkIds.add(artworks[0].id);
  }

  // Any remaining unmapped artworks
  const unmappedArtworks = artworks.filter((a) => !usedArtworkIds.has(a.id));

  return { mappedItems, unmappedArtworks };
}
