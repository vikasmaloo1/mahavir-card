import dotenv from "dotenv";
import { createHash } from "node:crypto";

dotenv.config({ path: ".env.local" });
dotenv.config();

function uuidFor(value: string) {
  const hex = createHash("sha256").update(value).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function money(value: number | undefined) {
  return value === undefined ? undefined : value.toFixed(2);
}

async function main() {
  const { db, pool } = await import("../src/lib/db");
  const { eq } = await import("drizzle-orm");
  const {
    addons, artworkRequirements, artworkSlots, banners, businessSettings, categories, categoryImages,
    locationSurcharges, notices, pricingRules, productAddons, productContentItems,
    productContentSections, productDeliveryRules, productImages, products,
  } = await import("../src/lib/db/schema");
  const { rateCatalog } = await import("../src/lib/rate-catalog");

  await db.insert(businessSettings).values({
    id: "primary", businessName: "Mahavir Card", addressLine1: "Khadia Golwad",
    addressLine2: "Opp. Jain Digamber Mandir", city: "Ahmedabad", state: "Gujarat",
    postalCode: "380001", phone: "+91 94263 71150", email: "mahavircard2011@gmail.com",
    whatsapp: "+91 94263 71150", footerText: "All kind printing solutions for businesses.",
  }).onConflictDoNothing();

  await db.update(categories).set({ isActive: false, updatedAt: new Date() });
  await db.update(products).set({ isActive: false, status: "ARCHIVED", archivedAt: new Date(), updatedAt: new Date() });

  const categoryImageMap: Record<string, string> = {
    "visiting-card": "/images/visiting-card-category.jpg",
    "premium-card": "/images/premium-card-category.jpg",
    "art-card": "/images/art-card-category.jpg",
    "letterhead-envelope": "/images/letterhead-envelope-category.jpg",
    brochure: "/images/brochure-category.jpg",
    "leaflet-cover": "/images/leaflet-category.jpg",
    sticker: "/images/sticker-category.jpg",
  };

  for (const [categoryIndex, category] of rateCatalog.entries()) {
    console.log(`[${categoryIndex + 1}/${rateCatalog.length}] Seeding category: ${category.name}`);
    const categoryId = uuidFor(`rate-category:${category.slug}`);
    const categoryImageUrl = categoryImageMap[category.slug] || "/images/home-hero-printing.jpg";
    await db.insert(categories).values({
      id: categoryId, name: category.name, slug: category.slug, description: category.description,
      sortOrder: categoryIndex, isActive: true,
    }).onConflictDoUpdate({ target: categories.slug, set: {
      name: category.name, description: category.description, sortOrder: categoryIndex,
      isActive: true, updatedAt: new Date(),
    } });

    // Seed primary category image
    await db.insert(categoryImages).values({
      id: uuidFor(`category-image:${category.slug}`),
      categoryId,
      imageUrl: categoryImageUrl,
      storageKey: `categories/${categoryId}/images/${category.slug}.jpg`,
      originalFilename: `${category.slug}.jpg`,
      contentType: "image/jpeg",
      fileSize: 500000,
      altText: `${category.name} printing sample`,
      isPrimary: true,
      sortOrder: 0,
    }).onConflictDoUpdate({
      target: categoryImages.id,
      set: { imageUrl: categoryImageUrl, updatedAt: new Date() },
    });

    for (const [itemIndex, item] of category.items.entries()) {
      console.log(`   → Product ${itemIndex + 1}/${category.items.length}: ${item.name} (${item.slug})`);
      const productId = uuidFor(`rate-product:${item.slug}`);
      const ruleId = uuidFor(`rate-pricing:${item.slug}`);
      const requirementId = uuidFor(`rate-artwork:${item.slug}`);
      const pageSlots = item.artwork.slots;
      const uploadSlots = [{
        key: "DESIGN",
        name: "Production artwork",
        instructions: pageSlots.length > 1
          ? `Upload one CDR file with pages in this order: ${pageSlots.map((entry, index) => `${index + 1}. ${entry.name}`).join("; ")}.`
          : pageSlots[0]?.instructions,
      }];
      const isThermalPrintOptions = item.slug === "400-gsm-thermal-matt-single-side-uv" || item.slug === "400-gsm-thermal-matt-single-front-back";
      const baseQuantityField = { id: "quantity", label: "Quantity", type: "number" as const, defaultValue: String(item.referenceQuantity ?? 1000) };
      const configurationFields: Array<{ id: string; label: string; type: "select" | "number" | "text"; options?: string[]; defaultValue: string; suffix?: string }> = item.ruleType === "PER_SQ_INCH"
        ? [
            baseQuantityField,
            { id: "width", label: "Width", type: "number", defaultValue: item.minimumArea ? "10" : "1", suffix: "in" },
            { id: "height", label: "Height", type: "number", defaultValue: item.minimumArea ? "5" : "1", suffix: "in" },
            ...(item.bladeCharge ? [{ id: "bladeCount", label: `Half blades (₹${item.bladeCharge} / blade)`, type: "number" as const, defaultValue: "0" }] : []),
          ]
        : [
            baseQuantityField,
            ...(isThermalPrintOptions ? [{ id: "printingSide", label: "Printing option", type: "select" as const, options: ["Single Printing", "Front Back Printing"], defaultValue: "Single Printing" }] : []),
            ...(item.size && (category.slug === "leaflet-cover" || category.slug === "brochure") ? [{ id: "size", label: "Size", type: "select" as const, options: [item.size], defaultValue: item.size }] : []),
          ];

      const productImageUrl = categoryImageMap[category.slug] ?? "/images/home-hero-printing.jpg";

      await db.insert(products).values({
        id: productId, categoryId, name: item.name, slug: item.slug,
        description: item.shortDescription, shortDescription: item.shortDescription,
        productCode: `RATE-${String(categoryIndex + 1).padStart(2, "0")}-${String(itemIndex + 1).padStart(2, "0")}`,
        productReference: `RATE.xlsx/Sheet${categoryIndex + 1}`,
        productClass: category.name, productType: "CONFIGURABLE", configuration: { fields: configurationFields, size: item.size ?? null },
        imageUrl: productImageUrl, status: "ACTIVE", orderable: true, quoteable: item.quoteable ?? true, isActive: true,
        productionTime: item.productionTime ?? null, artworkRequired: true,
        artworkInstructions: "Upload one production-ready CorelDRAW file. Where multiple artwork pages are required, keep them in the listed order.",
        sortOrder: categoryIndex * 100 + itemIndex,
        referenceQuantity: item.referenceQuantity ?? null,
        referenceWeight: item.referenceWeight ? item.referenceWeight.toFixed(3) : null,
        referenceWeightUnit: item.referenceWeight ? "KG" : null,
        pricesTaxInclusive: false, archivedAt: null, updatedAt: new Date(),
      }).onConflictDoUpdate({ target: products.slug, set: {
        categoryId, name: item.name, description: item.shortDescription, shortDescription: item.shortDescription,
        productCode: `RATE-${String(categoryIndex + 1).padStart(2, "0")}-${String(itemIndex + 1).padStart(2, "0")}`,
        productReference: `RATE.xlsx/Sheet${categoryIndex + 1}`, productClass: category.name,
        configuration: { fields: configurationFields, size: item.size ?? null }, imageUrl: productImageUrl, status: "ACTIVE", orderable: true,
        quoteable: item.quoteable ?? true, isActive: true, productionTime: item.productionTime ?? null, artworkRequired: true,
        artworkInstructions: "Upload one production-ready CorelDRAW file. Where multiple artwork pages are required, keep them in the listed order.",
        sortOrder: categoryIndex * 100 + itemIndex, referenceQuantity: item.referenceQuantity ?? null,
        referenceWeight: item.referenceWeight ? item.referenceWeight.toFixed(3) : null,
        referenceWeightUnit: item.referenceWeight ? "KG" : null, pricesTaxInclusive: false, archivedAt: null, updatedAt: new Date(),
      } });

      await db.update(pricingRules).set({ isActive: false, updatedAt: new Date() }).where(eq(pricingRules.productId, productId));
      const priceFormula = item.ruleType === "PER_SQ_INCH"
        ? {
            ratePerSqInch: item.rateUnit === "PAISE" ? (item.ratePerSqInch ?? 0) : item.ratePerSqInch,
            ratePaisePerSqInch: item.rateUnit === "PAISE" ? item.ratePerSqInch : null,
            rateUnit: item.rateUnit ?? "RUPEES", unit: "reference_batch_area", minimumArea: item.minimumArea ?? null,
            minimumCharge: item.minimumCharge ?? null, bladeCharge: item.bladeCharge ?? null,
            sourceDisplayedRate: item.sourceDisplayedRate ?? null, source: "RATE.xlsx", sheet: categoryIndex + 1,
          }
        : {
            amount: money(item.amount), unit: "batch", sourceNetAmount: money(item.netAmount),
            source: "RATE.xlsx", sheet: categoryIndex + 1,
          };
      await db.insert(pricingRules).values({
        id: ruleId, productId, name: item.name, ruleType: item.ruleType,
        conditions: { quantity: item.referenceQuantity ?? 1, specification: item.name, size: item.size ?? null },
        priceFormula, taxRate: item.taxRate?.toFixed(3) ?? null, productionTime: item.productionTime ?? null,
        sortOrder: itemIndex, taxInclusive: false, isActive: true,
      }).onConflictDoUpdate({ target: pricingRules.id, set: {
        productId, name: item.name, ruleType: item.ruleType,
        conditions: { quantity: item.referenceQuantity ?? 1, specification: item.name, size: item.size ?? null },
        priceFormula, taxRate: item.taxRate?.toFixed(3) ?? null, productionTime: item.productionTime ?? null,
        sortOrder: itemIndex, taxInclusive: false, isActive: true, updatedAt: new Date(),
      } });

      await db.update(artworkRequirements).set({ isActive: false, updatedAt: new Date() }).where(eq(artworkRequirements.productId, productId));
      await db.insert(artworkRequirements).values({
        id: requirementId, productId, pricingRuleId: ruleId, scopeKey: `PRICING_RULE:${ruleId}`,
        artworkRequired: true, acceptedFormats: ["CDR"], maxFileSize: 100, maxFiles: uploadSlots.length,
        designWidth: item.artwork.design?.[0]?.toString() ?? null, designHeight: item.artwork.design?.[1]?.toString() ?? null,
        designUnit: "mm", safeAreaWidth: item.artwork.safe?.[0]?.toString() ?? null,
        safeAreaHeight: item.artwork.safe?.[1]?.toString() ?? null, finalWidth: item.artwork.final?.[0]?.toString() ?? null,
        finalHeight: item.artwork.final?.[1]?.toString() ?? null, orientation: "ANY",
        pageInstructions: pageSlots.map((entry, index) => ({ pageNumber: index + 1, label: entry.name, notes: entry.instructions ?? null, required: true })),
        multiplePageInstructions: pageSlots.length > 1 ? "Upload one CDR file containing these pages in the listed order." : null,
        additionalInstructions: [
          item.minimumArea ? `THIS JOB BIG SIZE ONLY (MINIMUM SQ. INCH ${item.minimumArea}).` : null,
          category.slug === "art-card"
            ? "Recommended Black Color Ratio: C-50, M-20, Y-20, K-100 for achieving a rich, premium black in print."
            : item.artwork.black ? `Recommended rich black: ${item.artwork.black}.` : null,
          "Use high-resolution imagery and convert fonts to curves."
        ].filter(Boolean).join(" "),
        notes: item.minimumArea ? `THIS JOB BIG SIZE ONLY (MINIMUM SQ. INCH ${item.minimumArea}).` : `Imported from RATE.xlsx Sheet ${categoryIndex + 1}.`, isActive: true,
      }).onConflictDoUpdate({ target: artworkRequirements.id, set: {
        productId, pricingRuleId: ruleId, scopeKey: `PRICING_RULE:${ruleId}`, artworkRequired: true, acceptedFormats: ["CDR"], maxFileSize: 100,
        maxFiles: uploadSlots.length, designWidth: item.artwork.design?.[0]?.toString() ?? null,
        designHeight: item.artwork.design?.[1]?.toString() ?? null, designUnit: "mm", safeAreaWidth: item.artwork.safe?.[0]?.toString() ?? null,
        safeAreaHeight: item.artwork.safe?.[1]?.toString() ?? null, finalWidth: item.artwork.final?.[0]?.toString() ?? null,
        finalHeight: item.artwork.final?.[1]?.toString() ?? null, orientation: "ANY",
        pageInstructions: pageSlots.map((entry, index) => ({ pageNumber: index + 1, label: entry.name, notes: entry.instructions ?? null, required: true })),
        multiplePageInstructions: pageSlots.length > 1 ? "Upload one CDR file containing these pages in the listed order." : null,
        additionalInstructions: [
          item.minimumArea ? `THIS JOB BIG SIZE ONLY (MINIMUM SQ. INCH ${item.minimumArea}).` : null,
          category.slug === "art-card"
            ? "Recommended Black Color Ratio: C-50, M-20, Y-20, K-100 for achieving a rich, premium black in print."
            : item.artwork.black ? `Recommended rich black: ${item.artwork.black}.` : null,
          "Use high-resolution imagery and convert fonts to curves."
        ].filter(Boolean).join(" "),
        notes: `Imported from RATE.xlsx Sheet ${categoryIndex + 1}.`, isActive: true, updatedAt: new Date(),
      } });
      await db.update(artworkSlots).set({ isActive: false, updatedAt: new Date() }).where(eq(artworkSlots.artworkRequirementId, requirementId));
      for (const [slotIndex, entry] of uploadSlots.entries()) {
        const slotId = uuidFor(`rate-artwork-slot:${item.slug}:${entry.key}`);
        await db.insert(artworkSlots).values({
          id: slotId, artworkRequirementId: requirementId, pricingRuleId: ruleId, slotKey: entry.key,
          name: entry.name, required: true, acceptedFormats: ["CDR"], maxFileSize: 100,
          instructions: entry.instructions ?? null, sortOrder: slotIndex, isActive: true,
        }).onConflictDoUpdate({ target: artworkSlots.id, set: {
          name: entry.name, required: true, acceptedFormats: ["CDR"], maxFileSize: 100,
          instructions: entry.instructions ?? null, sortOrder: slotIndex, isActive: true, updatedAt: new Date(),
        } });
      }

      await db.update(productAddons).set({ isActive: false, updatedAt: new Date() }).where(eq(productAddons.productId, productId));
      if (item.addon) {
        const addonId = uuidFor(`rate-addon:${item.addon.code}`);
        const refQty = "referenceQuantity" in item.addon && typeof item.addon.referenceQuantity === "number" ? item.addon.referenceQuantity : 1000;
        await db.insert(addons).values({ id: addonId, name: item.addon.name, code: item.addon.code, pricingType: "FIXED", priceConfiguration: { source: "RATE.xlsx", referenceQuantity: refQty }, isActive: true }).onConflictDoUpdate({ target: addons.code, set: { name: item.addon.name, priceConfiguration: { source: "RATE.xlsx", referenceQuantity: refQty }, isActive: true, updatedAt: new Date() } });
        await db.insert(productAddons).values({
          id: uuidFor(`rate-product-addon:${item.slug}:${item.addon.code}`), productId, pricingRuleId: ruleId,
          addonId, price: money(item.addon.amount)!, isActive: true,
          isDefault: false, sortOrder: 0, taxInclusive: false,
        }).onConflictDoUpdate({ target: productAddons.id, set: { pricingRuleId: ruleId, price: money(item.addon.amount)!, isActive: true, taxInclusive: false, updatedAt: new Date() } });
      }

      await db.update(productDeliveryRules).set({ isActive: false, updatedAt: new Date() }).where(eq(productDeliveryRules.productId, productId));
      const deliveryRows = item.delivery ? [
        { method: "PICKUP", stateCode: "*", price: 0, sortOrder: 0 },
        { method: "COURIER", stateCode: "GJ", price: item.delivery.GJ, sortOrder: 1 },
        { method: "COURIER", stateCode: "RJ", price: item.delivery.RJ, sortOrder: 2 },
      ] : [];
      for (const delivery of deliveryRows) {
        await db.insert(productDeliveryRules).values({
          id: uuidFor(`rate-delivery:${item.slug}:${delivery.method}:${delivery.stateCode}`), productId,
          deliveryMethod: delivery.method, stateCode: delivery.stateCode, price: money(delivery.price)!,
          isActive: true, sortOrder: delivery.sortOrder, taxInclusive: false,
        }).onConflictDoUpdate({ target: productDeliveryRules.id, set: { price: money(delivery.price)!, isActive: true, sortOrder: delivery.sortOrder, taxInclusive: false, updatedAt: new Date() } });
      }

      await db.update(locationSurcharges).set({ isActive: false, updatedAt: new Date() }).where(eq(locationSurcharges.productId, productId));
      if (item.slug === "nt-single") {
        await db.insert(locationSurcharges).values({
          id: uuidFor("rate-location-surcharge:nt-single:outside-ahmedabad"), productId, pricingRuleId: ruleId,
          locationScope: "OUTSIDE_CITY", city: "Ahmedabad", stateCode: null, amount: "10.00",
          taxInclusive: false, isActive: true, sortOrder: 0,
        }).onConflictDoUpdate({ target: locationSurcharges.id, set: { pricingRuleId: ruleId, amount: "10.00", isActive: true, updatedAt: new Date() } });
      }

        const sectionId = uuidFor(`rate-content:${item.slug}:technical`);
        await db.insert(productContentSections).values({ id: sectionId, productId, title: "Technical specifications", sortOrder: 0 }).onConflictDoUpdate({ target: productContentSections.id, set: { title: "Technical specifications", sortOrder: 0, updatedAt: new Date() } });
        const content = [item.size ? `Size: ${item.size}` : null, item.productionTime ? `Production: ${item.productionTime}` : null].filter(Boolean).join(" · ") || "Configured from the current RATE.xlsx source.";
        await db.insert(productContentItems).values({ id: uuidFor(`rate-content-item:${item.slug}:technical`), sectionId, label: "Current specification", content, sortOrder: 0 }).onConflictDoUpdate({ target: productContentItems.id, set: { label: "Current specification", content, sortOrder: 0, updatedAt: new Date() } });
      }
    }

    const defaultNotices = [
      {
        id: uuidFor("notice:visiting-card-artwork"),
        title: "Visiting Card artwork",
        message: "Final size 90 × 53 mm · Convert fonts to curves",
        tone: "INFO",
        placement: "GLOBAL",
        animationType: "MARQUEE",
        priority: "HIGH",
        linkLabel: "View products",
        linkUrl: "/products",
        sortOrder: 0,
        isActive: true,
      },
      {
        id: uuidFor("notice:file-name-guideline"),
        title: "Artwork filenames",
        message: "Use short file names and avoid special characters",
        tone: "WARNING",
        placement: "GLOBAL",
        animationType: "MARQUEE",
        priority: "HIGH",
        linkLabel: null,
        linkUrl: null,
        sortOrder: 1,
        isActive: true,
      },
      {
        id: uuidFor("notice:base-prices"),
        title: "Base prices shown",
        message: "GST charged additionally as applicable on print jobs",
        tone: "INFO",
        placement: "GLOBAL",
        animationType: "MARQUEE",
        priority: "NORMAL",
        linkLabel: null,
        linkUrl: null,
        sortOrder: 2,
        isActive: true,
      },
      {
        id: uuidFor("notice:bulk-orders"),
        title: "Bulk printing orders welcome",
        message: "Custom quotations available for volume orders",
        tone: "SUCCESS",
        placement: "GLOBAL",
        animationType: "MARQUEE",
        priority: "HIGH",
        linkLabel: "Request a quote",
        linkUrl: "/quote",
        sortOrder: 3,
        isActive: true,
      },
      {
        id: uuidFor("notice:color-guideline"),
        title: "Color guideline",
        message: "Avoid 4-color rich black mix to prevent shade variation",
        tone: "INFO",
        placement: "GLOBAL",
        animationType: "MARQUEE",
        priority: "NORMAL",
        linkLabel: null,
        linkUrl: null,
        sortOrder: 4,
        isActive: true,
      },
      {
        id: uuidFor("notice:courier-delivery"),
        title: "Direct courier delivery",
        message: "Gujarat & Rajasthan dispatch on selected products",
        tone: "INFO",
        placement: "GLOBAL",
        animationType: "MARQUEE",
        priority: "NORMAL",
        linkLabel: null,
        linkUrl: null,
        sortOrder: 5,
        isActive: true,
      },
      {
        id: uuidFor("notice:cdr-single-file"),
        title: "CDR artwork requirements",
        message: "Include front, back & Spot UV separation in a single file",
        tone: "WARNING",
        placement: "GLOBAL",
        animationType: "MARQUEE",
        priority: "NORMAL",
        linkLabel: null,
        linkUrl: null,
        sortOrder: 6,
        isActive: true,
      },
    ];

    for (const notice of defaultNotices) {
      await db.insert(notices).values(notice).onConflictDoUpdate({
        target: notices.id,
        set: {
          title: notice.title,
          message: notice.message,
          tone: notice.tone,
          placement: notice.placement,
          animationType: notice.animationType,
          priority: notice.priority,
          linkLabel: notice.linkLabel,
          linkUrl: notice.linkUrl,
          sortOrder: notice.sortOrder,
          isActive: notice.isActive,
          updatedAt: new Date(),
        },
      });
    }

    const defaultBanners = [
      {
        id: uuidFor("banner:home-hero-sub"),
        title: "Tactile Luxury Visiting Cards",
        subtitle: "Velvet soft-touch, thermal matt, spot UV gloss, and metallic gold foil edge stamping on heavy card stock.",
        badge: "Premium Finishes",
        ctaLabel: "Explore Visiting Cards",
        ctaUrl: "/products?category=visiting-card",
        imageUrl: "/images/visiting-card-promo.jpg",
        storageKey: null,
        placement: "HOME_HERO_BOTTOM",
        animationType: "FADE",
        sortOrder: 0,
        isActive: true,
      },
      {
        id: uuidFor("banner:home-mid"),
        title: "250 GSM Heavy Art Card Brochures",
        subtitle: "Brochures, flyers, and pamphlets printed with vibrant CMYK saturation and sharp machine creasing.",
        badge: "250 GSM Art Card",
        ctaLabel: "Configure Brochures",
        ctaUrl: "/products?category=brochure",
        imageUrl: "/images/brochure-category.jpg",
        storageKey: null,
        placement: "HOME_MID",
        animationType: "SLIDE_UP",
        sortOrder: 0,
        isActive: true,
      },
      {
        id: uuidFor("banner:catalog-top"),
        title: "Production-Ready CorelDRAW Artwork",
        subtitle: "Direct CDR file upload with CMYK color compliance, safe margins, and automatic page sequence verification.",
        badge: "Artwork Guidance",
        ctaLabel: "Explore Products",
        ctaUrl: "/products",
        imageUrl: "/images/home-hero-printing.jpg",
        storageKey: null,
        placement: "CATALOG_TOP",
        animationType: "FADE",
        sortOrder: 0,
        isActive: true,
      },
      {
        id: uuidFor("banner:cart-checkout"),
        title: "Gujarat & Rajasthan Direct Courier Dispatch",
        subtitle: "Secure bulk transit packaging, scheduled carrier dispatch, and local Khadia Golwad store pickup available.",
        badge: "Reliable Delivery",
        ctaLabel: "Continue Shopping",
        ctaUrl: "/products",
        imageUrl: "/images/home-hero-printing.jpg",
        storageKey: null,
        placement: "CART_CHECKOUT",
        animationType: "IMAGE_ZOOM",
        sortOrder: 0,
        isActive: true,
      },
    ];

    for (const banner of defaultBanners) {
      await db.insert(banners).values(banner).onConflictDoUpdate({
        target: banners.id,
        set: {
          title: banner.title,
          subtitle: banner.subtitle,
          badge: banner.badge,
          ctaLabel: banner.ctaLabel,
          ctaUrl: banner.ctaUrl,
          imageUrl: banner.imageUrl,
          storageKey: banner.storageKey,
          placement: banner.placement,
          animationType: banner.animationType,
          sortOrder: banner.sortOrder,
          isActive: banner.isActive,
          updatedAt: new Date(),
        },
      });
    }

  const productCount = rateCatalog.reduce((sum, category) => sum + category.items.length, 0);
  console.log(`Seeded RATE.xlsx catalog: ${rateCatalog.length} active categories and ${productCount} active configurations.`);
  console.log("Ambiguity retained: Art Card displayed rates differ from workbook formula multipliers; formulas drive pricing and displayed source rates remain in metadata.");
  console.log("Delivery is seeded only for approved products with explicit Gujarat/Rajasthan rules; all charges remain admin-configurable.");
  await pool.end();
  process.exit(0);
}

main().catch((error) => { console.error(error); process.exit(1); });
