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
  const { sql } = await import("drizzle-orm");
  const {
    addons, artworkRequirements, artworkSlots, banners, businessSettings, categories, locationSurcharges,
    notices, pricingRules, productAddons, productContentItems, productContentSections, productDeliveryRules, products,
  } = await import("../src/lib/db/schema");
  const { rateCatalog } = await import("../src/lib/rate-catalog");

  await db.transaction(async (tx) => {
    await tx.insert(businessSettings).values({
      id: "primary", businessName: "Mahavir Card", addressLine1: "Khadia Golwad",
      addressLine2: "Opp. Jain Digamber Mandir", city: "Ahmedabad", state: "Gujarat",
      postalCode: "380001", phone: "+91 94263 71150", email: "mahavircard2011@gmail.com",
      whatsapp: "+91 94263 71150", footerText: "All kind printing solutions for businesses.",
    }).onConflictDoNothing();

    await tx.update(categories).set({ isActive: false, updatedAt: new Date() });
    await tx.update(products).set({ isActive: false, status: "ARCHIVED", archivedAt: new Date(), updatedAt: new Date() });

    for (const [categoryIndex, category] of rateCatalog.entries()) {
      const categoryId = uuidFor(`rate-category:${category.slug}`);
      await tx.insert(categories).values({
        id: categoryId, name: category.name, slug: category.slug, description: category.description,
        sortOrder: categoryIndex, isActive: true,
      }).onConflictDoUpdate({ target: categories.slug, set: {
        name: category.name, description: category.description, sortOrder: categoryIndex,
        isActive: true, updatedAt: new Date(),
      } });

      for (const [itemIndex, item] of category.items.entries()) {
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
        const configurationFields = item.ruleType === "PER_SQ_INCH"
          ? [
              { id: "quantity", label: "Reference quantity", type: "number", defaultValue: String(item.referenceQuantity ?? 1) },
              { id: "width", label: "Width", type: "number", defaultValue: "1", suffix: "in" },
              { id: "height", label: "Height", type: "number", defaultValue: "1", suffix: "in" },
              ...(item.bladeCharge ? [{ id: "bladeCount", label: "Half blades", type: "number", defaultValue: "0" }] : []),
            ]
          : [{ id: "quantity", label: "Quantity", type: "number", defaultValue: String(item.referenceQuantity ?? 1) }];

        await tx.insert(products).values({
          id: productId, categoryId, name: item.name, slug: item.slug,
          description: item.shortDescription, shortDescription: item.shortDescription,
          productCode: `RATE-${String(categoryIndex + 1).padStart(2, "0")}-${String(itemIndex + 1).padStart(2, "0")}`,
          productReference: `RATE.xlsx/Sheet${categoryIndex + 1}`,
          productClass: category.name, productType: "CONFIGURABLE", configuration: { fields: configurationFields, size: item.size ?? null },
          imageUrl: null, status: "ACTIVE", orderable: true, quoteable: item.quoteable ?? true, isActive: true,
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
          configuration: { fields: configurationFields, size: item.size ?? null }, status: "ACTIVE", orderable: true,
          quoteable: item.quoteable ?? true, isActive: true, productionTime: item.productionTime ?? null, artworkRequired: true,
          artworkInstructions: "Upload one production-ready CorelDRAW file. Where multiple artwork pages are required, keep them in the listed order.",
          sortOrder: categoryIndex * 100 + itemIndex, referenceQuantity: item.referenceQuantity ?? null,
          referenceWeight: item.referenceWeight ? item.referenceWeight.toFixed(3) : null,
          referenceWeightUnit: item.referenceWeight ? "KG" : null, pricesTaxInclusive: false, archivedAt: null, updatedAt: new Date(),
        } });

        await tx.update(pricingRules).set({ isActive: false, updatedAt: new Date() }).where(sql`${pricingRules.productId} = ${productId}`);
        const priceFormula = item.ruleType === "PER_SQ_INCH"
          ? {
              ratePerSqInch: item.rateUnit === "PAISE" ? (item.ratePerSqInch ?? 0) / 100 : item.ratePerSqInch,
              ratePaisePerSqInch: item.rateUnit === "PAISE" ? item.ratePerSqInch : null,
              rateUnit: item.rateUnit ?? "RUPEES", unit: "reference_batch_area", minimumArea: item.minimumArea ?? null,
              minimumCharge: item.minimumCharge ?? null, bladeCharge: item.bladeCharge ?? null,
              sourceDisplayedRate: item.sourceDisplayedRate ?? null, source: "RATE.xlsx", sheet: categoryIndex + 1,
            }
          : {
              amount: money(item.amount), unit: "batch", sourceNetAmount: money(item.netAmount),
              source: "RATE.xlsx", sheet: categoryIndex + 1,
            };
        await tx.insert(pricingRules).values({
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

        await tx.update(artworkRequirements).set({ isActive: false, updatedAt: new Date() }).where(sql`${artworkRequirements.productId} = ${productId}`);
        await tx.insert(artworkRequirements).values({
          id: requirementId, productId, pricingRuleId: ruleId, scopeKey: `PRICING_RULE:${ruleId}`,
          artworkRequired: true, acceptedFormats: ["CDR"], maxFileSize: 100, maxFiles: uploadSlots.length,
          designWidth: item.artwork.design?.[0]?.toString() ?? null, designHeight: item.artwork.design?.[1]?.toString() ?? null,
          designUnit: "mm", safeAreaWidth: item.artwork.safe?.[0]?.toString() ?? null,
          safeAreaHeight: item.artwork.safe?.[1]?.toString() ?? null, finalWidth: item.artwork.final?.[0]?.toString() ?? null,
          finalHeight: item.artwork.final?.[1]?.toString() ?? null, orientation: "ANY",
          pageInstructions: pageSlots.map((entry, index) => ({ pageNumber: index + 1, label: entry.name, notes: entry.instructions ?? null, required: true })),
          multiplePageInstructions: pageSlots.length > 1 ? "Upload one CDR file containing these pages in the listed order." : null,
          additionalInstructions: [item.artwork.black ? `Recommended rich black: ${item.artwork.black}.` : null, "Use high-resolution imagery and convert fonts to curves."].filter(Boolean).join(" "),
          notes: `Imported from RATE.xlsx Sheet ${categoryIndex + 1}.`, isActive: true,
        }).onConflictDoUpdate({ target: artworkRequirements.id, set: {
          productId, pricingRuleId: ruleId, scopeKey: `PRICING_RULE:${ruleId}`, artworkRequired: true, acceptedFormats: ["CDR"], maxFileSize: 100,
          maxFiles: uploadSlots.length, designWidth: item.artwork.design?.[0]?.toString() ?? null,
          designHeight: item.artwork.design?.[1]?.toString() ?? null, designUnit: "mm", safeAreaWidth: item.artwork.safe?.[0]?.toString() ?? null,
          safeAreaHeight: item.artwork.safe?.[1]?.toString() ?? null, finalWidth: item.artwork.final?.[0]?.toString() ?? null,
          finalHeight: item.artwork.final?.[1]?.toString() ?? null, orientation: "ANY",
          pageInstructions: pageSlots.map((entry, index) => ({ pageNumber: index + 1, label: entry.name, notes: entry.instructions ?? null, required: true })),
          multiplePageInstructions: pageSlots.length > 1 ? "Upload one CDR file containing these pages in the listed order." : null,
          additionalInstructions: [item.artwork.black ? `Recommended rich black: ${item.artwork.black}.` : null, "Use high-resolution imagery and convert fonts to curves."].filter(Boolean).join(" "),
          notes: `Imported from RATE.xlsx Sheet ${categoryIndex + 1}.`, isActive: true, updatedAt: new Date(),
        } });
        await tx.update(artworkSlots).set({ isActive: false, updatedAt: new Date() }).where(sql`${artworkSlots.artworkRequirementId} = ${requirementId}`);
        for (const [slotIndex, entry] of uploadSlots.entries()) {
          const slotId = uuidFor(`rate-artwork-slot:${item.slug}:${entry.key}`);
          await tx.insert(artworkSlots).values({
            id: slotId, artworkRequirementId: requirementId, pricingRuleId: ruleId, slotKey: entry.key,
            name: entry.name, required: true, acceptedFormats: ["CDR"], maxFileSize: 100,
            instructions: entry.instructions ?? null, sortOrder: slotIndex, isActive: true,
          }).onConflictDoUpdate({ target: artworkSlots.id, set: {
            name: entry.name, required: true, acceptedFormats: ["CDR"], maxFileSize: 100,
            instructions: entry.instructions ?? null, sortOrder: slotIndex, isActive: true, updatedAt: new Date(),
          } });
        }

        await tx.update(productAddons).set({ isActive: false, updatedAt: new Date() }).where(sql`${productAddons.productId} = ${productId}`);
        if (item.addon) {
          const addonId = uuidFor(`rate-addon:${item.addon.code}`);
          await tx.insert(addons).values({ id: addonId, name: item.addon.name, code: item.addon.code, pricingType: "FIXED", priceConfiguration: { source: "RATE.xlsx" }, isActive: true }).onConflictDoUpdate({ target: addons.code, set: { name: item.addon.name, isActive: true, updatedAt: new Date() } });
          await tx.insert(productAddons).values({
            id: uuidFor(`rate-product-addon:${item.slug}:${item.addon.code}`), productId, pricingRuleId: ruleId,
            addonId, price: money(item.addon.amount)!, isActive: true,
            isDefault: false, sortOrder: 0, taxInclusive: false,
          }).onConflictDoUpdate({ target: productAddons.id, set: { pricingRuleId: ruleId, price: money(item.addon.amount)!, isActive: true, taxInclusive: false, updatedAt: new Date() } });
        }

        await tx.update(productDeliveryRules).set({ isActive: false, updatedAt: new Date() }).where(sql`${productDeliveryRules.productId} = ${productId}`);
        const deliveryRows = item.delivery ? [
          { method: "PICKUP", stateCode: "*", price: 0, sortOrder: 0 },
          { method: "COURIER", stateCode: "GJ", price: item.delivery.GJ, sortOrder: 1 },
          { method: "COURIER", stateCode: "RJ", price: item.delivery.RJ, sortOrder: 2 },
        ] : [];
        for (const delivery of deliveryRows) {
          await tx.insert(productDeliveryRules).values({
            id: uuidFor(`rate-delivery:${item.slug}:${delivery.method}:${delivery.stateCode}`), productId,
            deliveryMethod: delivery.method, stateCode: delivery.stateCode, price: money(delivery.price)!,
            isActive: true, sortOrder: delivery.sortOrder, taxInclusive: false,
          }).onConflictDoUpdate({ target: productDeliveryRules.id, set: { price: money(delivery.price)!, isActive: true, sortOrder: delivery.sortOrder, taxInclusive: false, updatedAt: new Date() } });
        }

        await tx.update(locationSurcharges).set({ isActive: false, updatedAt: new Date() }).where(sql`${locationSurcharges.productId} = ${productId}`);
        if (item.slug === "nt-single") {
          await tx.insert(locationSurcharges).values({
            id: uuidFor("rate-location-surcharge:nt-single:outside-ahmedabad"), productId, pricingRuleId: ruleId,
            locationScope: "OUTSIDE_CITY", city: "Ahmedabad", stateCode: null, amount: "10.00",
            taxInclusive: false, isActive: true, sortOrder: 0,
          }).onConflictDoUpdate({ target: locationSurcharges.id, set: { pricingRuleId: ruleId, amount: "10.00", isActive: true, updatedAt: new Date() } });
        }

        const sectionId = uuidFor(`rate-content:${item.slug}:technical`);
        await tx.insert(productContentSections).values({ id: sectionId, productId, title: "Technical specifications", sortOrder: 0 }).onConflictDoUpdate({ target: productContentSections.id, set: { title: "Technical specifications", sortOrder: 0, updatedAt: new Date() } });
        const content = [item.size ? `Size: ${item.size}` : null, item.productionTime ? `Production: ${item.productionTime}` : null].filter(Boolean).join(" · ") || "Configured from the current RATE.xlsx source.";
        await tx.insert(productContentItems).values({ id: uuidFor(`rate-content-item:${item.slug}:technical`), sectionId, label: "Current specification", content, sortOrder: 0 }).onConflictDoUpdate({ target: productContentItems.id, set: { label: "Current specification", content, sortOrder: 0, updatedAt: new Date() } });
      }
    }

    const defaultNotices = [
      {
        id: uuidFor("notice:cdr-artwork"),
        title: "Important: CDR artwork required for selected products",
        message: "",
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
        id: uuidFor("notice:base-prices"),
        title: "Base prices shown; GST extra as applicable",
        message: "",
        tone: "INFO",
        placement: "GLOBAL",
        animationType: "MARQUEE",
        priority: "NORMAL",
        linkLabel: null,
        linkUrl: null,
        sortOrder: 1,
        isActive: true,
      },
      {
        id: uuidFor("notice:bulk-orders"),
        title: "Bulk printing orders welcome",
        message: "Custom quotations available",
        tone: "SUCCESS",
        placement: "GLOBAL",
        animationType: "MARQUEE",
        priority: "HIGH",
        linkLabel: "Request a quote",
        linkUrl: "/quote",
        sortOrder: 2,
        isActive: true,
      },
      {
        id: uuidFor("notice:courier-delivery"),
        title: "Selected products available with courier delivery",
        message: "Gujarat & Rajasthan dispatch",
        tone: "INFO",
        placement: "GLOBAL",
        animationType: "MARQUEE",
        priority: "NORMAL",
        linkLabel: null,
        linkUrl: null,
        sortOrder: 3,
        isActive: true,
      },
      {
        id: uuidFor("notice:cdr-single-file"),
        title: "Upload one CDR file for applicable card jobs",
        message: "Front, back & Spot UV in single file",
        tone: "WARNING",
        placement: "GLOBAL",
        animationType: "MARQUEE",
        priority: "NORMAL",
        linkLabel: null,
        linkUrl: null,
        sortOrder: 4,
        isActive: true,
      },
    ];

    for (const notice of defaultNotices) {
      await tx.insert(notices).values(notice).onConflictDoUpdate({
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
        title: "Business printing, one place.",
        subtitle: "Visiting cards, carton packaging, custom product labels and commercial stationery.",
        badge: "Commercial Printing",
        ctaLabel: "Browse Products",
        ctaUrl: "/products",
        imageUrl: "/images/mahavir-print-assortment.png",
        storageKey: null,
        placement: "HOME_HERO_BOTTOM",
        animationType: "FADE",
        sortOrder: 0,
        isActive: true,
      },
      {
        id: uuidFor("banner:home-mid"),
        title: "Need bulk printing or custom specifications?",
        subtitle: "Request a tailored quotation for volume runs above 10,000 units, custom packaging, or bespoke finishes.",
        badge: "Bulk Orders & Custom",
        ctaLabel: "Request a Quote",
        ctaUrl: "/quote",
        imageUrl: "/images/mahavir-print-assortment.png",
        storageKey: null,
        placement: "HOME_MID",
        animationType: "SLIDE_UP",
        sortOrder: 0,
        isActive: true,
      },
      {
        id: uuidFor("banner:catalog-top"),
        title: "Upload your CDR artwork",
        subtitle: "Production-ready file guidance: maintain safe margins, 300 DPI resolution, and page hierarchy for flawless offset output.",
        badge: "File Guidance",
        ctaLabel: "Production Guidance",
        ctaUrl: "/quote",
        imageUrl: "/images/mahavir-print-assortment.png",
        storageKey: null,
        placement: "CATALOG_TOP",
        animationType: "FADE",
        sortOrder: 0,
        isActive: true,
      },
      {
        id: uuidFor("banner:cart-checkout"),
        title: "Gujarat & Rajasthan direct courier dispatch",
        subtitle: "Secure packaging, verified dispatch timeline, and local Khadia Golwad store pickup available.",
        badge: "Delivery & Pickup",
        ctaLabel: "View Delivery Options",
        ctaUrl: "/products",
        imageUrl: "/images/mahavir-print-assortment.png",
        storageKey: null,
        placement: "CART_CHECKOUT",
        animationType: "IMAGE_ZOOM",
        sortOrder: 0,
        isActive: true,
      },
    ];

    for (const banner of defaultBanners) {
      await tx.insert(banners).values(banner).onConflictDoUpdate({
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
  });

  const productCount = rateCatalog.reduce((sum, category) => sum + category.items.length, 0);
  console.log(`Seeded RATE.xlsx catalog: ${rateCatalog.length} active categories and ${productCount} active configurations.`);
  console.log("Ambiguity retained: Art Card displayed rates differ from workbook formula multipliers; formulas drive pricing and displayed source rates remain in metadata.");
  console.log("Delivery is seeded only for approved products with explicit Gujarat/Rajasthan rules; all charges remain admin-configurable.");
  await pool.end();
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
