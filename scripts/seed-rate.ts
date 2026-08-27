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
    addons, artworkRequirements, artworkSlots, businessSettings, categories, locationSurcharges,
    pricingRules, productAddons, productContentItems, productContentSections, productDeliveryRules, products,
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
          imageUrl: null, status: "ACTIVE", orderable: true, quoteable: true, isActive: true,
          productionTime: item.productionTime ?? null, artworkRequired: true,
          artworkInstructions: "Upload the required production-ready CorelDRAW files in the named artwork slots.",
          sortOrder: categoryIndex * 100 + itemIndex,
          referenceQuantity: item.referenceQuantity ?? null,
          referenceWeight: item.referenceWeight ? item.referenceWeight.toFixed(3) : null,
          referenceWeightUnit: item.referenceWeight ? "KG" : null,
          pricesTaxInclusive: true, archivedAt: null, updatedAt: new Date(),
        }).onConflictDoUpdate({ target: products.slug, set: {
          categoryId, name: item.name, description: item.shortDescription, shortDescription: item.shortDescription,
          productCode: `RATE-${String(categoryIndex + 1).padStart(2, "0")}-${String(itemIndex + 1).padStart(2, "0")}`,
          productReference: `RATE.xlsx/Sheet${categoryIndex + 1}`, productClass: category.name,
          configuration: { fields: configurationFields, size: item.size ?? null }, status: "ACTIVE", orderable: true,
          quoteable: true, isActive: true, productionTime: item.productionTime ?? null, artworkRequired: true,
          artworkInstructions: "Upload the required production-ready CorelDRAW files in the named artwork slots.",
          sortOrder: categoryIndex * 100 + itemIndex, referenceQuantity: item.referenceQuantity ?? null,
          referenceWeight: item.referenceWeight ? item.referenceWeight.toFixed(3) : null,
          referenceWeightUnit: item.referenceWeight ? "KG" : null, pricesTaxInclusive: true, archivedAt: null, updatedAt: new Date(),
        } });

        await tx.update(pricingRules).set({ isActive: false, updatedAt: new Date() }).where(sql`${pricingRules.productId} = ${productId}`);
        const priceFormula = item.ruleType === "PER_SQ_INCH"
          ? {
              ratePerSqInch: item.ratePerSqInch, unit: "reference_batch_area", minimumArea: item.minimumArea ?? null,
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
          sortOrder: itemIndex, taxInclusive: true, isActive: true,
        }).onConflictDoUpdate({ target: pricingRules.id, set: {
          productId, name: item.name, ruleType: item.ruleType,
          conditions: { quantity: item.referenceQuantity ?? 1, specification: item.name, size: item.size ?? null },
          priceFormula, taxRate: item.taxRate?.toFixed(3) ?? null, productionTime: item.productionTime ?? null,
          sortOrder: itemIndex, taxInclusive: true, isActive: true, updatedAt: new Date(),
        } });

        await tx.update(artworkRequirements).set({ isActive: false, updatedAt: new Date() }).where(sql`${artworkRequirements.productId} = ${productId}`);
        await tx.insert(artworkRequirements).values({
          id: requirementId, productId, pricingRuleId: ruleId, scopeKey: `PRICING_RULE:${ruleId}`,
          artworkRequired: true, acceptedFormats: ["CDR"], maxFileSize: 100, maxFiles: item.artwork.slots.length,
          designWidth: item.artwork.design?.[0]?.toString() ?? null, designHeight: item.artwork.design?.[1]?.toString() ?? null,
          designUnit: "mm", safeAreaWidth: item.artwork.safe?.[0]?.toString() ?? null,
          safeAreaHeight: item.artwork.safe?.[1]?.toString() ?? null, finalWidth: item.artwork.final?.[0]?.toString() ?? null,
          finalHeight: item.artwork.final?.[1]?.toString() ?? null, orientation: "ANY",
          pageInstructions: item.artwork.slots.map((entry, index) => ({ pageNumber: index + 1, label: entry.name, notes: entry.instructions ?? null, required: true })),
          multiplePageInstructions: item.artwork.slots.length > 1 ? "Upload each named production separation in its matching CDR slot." : null,
          additionalInstructions: [item.artwork.black ? `Recommended rich black: ${item.artwork.black}.` : null, "Use high-resolution imagery and convert fonts to curves."].filter(Boolean).join(" "),
          notes: `Imported from RATE.xlsx Sheet ${categoryIndex + 1}.`, isActive: true,
        }).onConflictDoUpdate({ target: artworkRequirements.id, set: {
          productId, pricingRuleId: ruleId, artworkRequired: true, acceptedFormats: ["CDR"], maxFileSize: 100,
          maxFiles: item.artwork.slots.length, designWidth: item.artwork.design?.[0]?.toString() ?? null,
          designHeight: item.artwork.design?.[1]?.toString() ?? null, safeAreaWidth: item.artwork.safe?.[0]?.toString() ?? null,
          safeAreaHeight: item.artwork.safe?.[1]?.toString() ?? null, finalWidth: item.artwork.final?.[0]?.toString() ?? null,
          finalHeight: item.artwork.final?.[1]?.toString() ?? null,
          pageInstructions: item.artwork.slots.map((entry, index) => ({ pageNumber: index + 1, label: entry.name, notes: entry.instructions ?? null, required: true })),
          multiplePageInstructions: item.artwork.slots.length > 1 ? "Upload each named production separation in its matching CDR slot." : null,
          additionalInstructions: [item.artwork.black ? `Recommended rich black: ${item.artwork.black}.` : null, "Use high-resolution imagery and convert fonts to curves."].filter(Boolean).join(" "),
          notes: `Imported from RATE.xlsx Sheet ${categoryIndex + 1}.`, isActive: true, updatedAt: new Date(),
        } });
        await tx.update(artworkSlots).set({ isActive: false, updatedAt: new Date() }).where(sql`${artworkSlots.artworkRequirementId} = ${requirementId}`);
        for (const [slotIndex, entry] of item.artwork.slots.entries()) {
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
            isDefault: false, sortOrder: 0, taxInclusive: true,
          }).onConflictDoUpdate({ target: productAddons.id, set: { pricingRuleId: ruleId, price: money(item.addon.amount)!, isActive: true, taxInclusive: true, updatedAt: new Date() } });
        }

        await tx.update(productDeliveryRules).set({ isActive: false, updatedAt: new Date() }).where(sql`${productDeliveryRules.productId} = ${productId}`);
        const deliveryRows = [
          { method: "PICKUP", stateCode: "*", price: 0, sortOrder: 0 },
          { method: "COURIER", stateCode: "GJ", price: 80, sortOrder: 1 },
          { method: "COURIER", stateCode: "*", price: 120, sortOrder: 2 },
        ];
        for (const delivery of deliveryRows) {
          await tx.insert(productDeliveryRules).values({
            id: uuidFor(`rate-delivery:${item.slug}:${delivery.method}:${delivery.stateCode}`), productId,
            deliveryMethod: delivery.method, stateCode: delivery.stateCode, price: money(delivery.price)!,
            isActive: true, sortOrder: delivery.sortOrder, taxInclusive: true,
          }).onConflictDoUpdate({ target: productDeliveryRules.id, set: { price: money(delivery.price)!, isActive: true, sortOrder: delivery.sortOrder, taxInclusive: true, updatedAt: new Date() } });
        }

        await tx.update(locationSurcharges).set({ isActive: false, updatedAt: new Date() }).where(sql`${locationSurcharges.productId} = ${productId}`);
        if (item.slug === "nt-single") {
          await tx.insert(locationSurcharges).values({
            id: uuidFor("rate-location-surcharge:nt-single:outside-ahmedabad"), productId, pricingRuleId: ruleId,
            locationScope: "OUTSIDE_CITY", city: "Ahmedabad", stateCode: null, amount: "10.00",
            taxInclusive: true, isActive: true, sortOrder: 0,
          }).onConflictDoUpdate({ target: locationSurcharges.id, set: { pricingRuleId: ruleId, amount: "10.00", isActive: true, updatedAt: new Date() } });
        }

        const sectionId = uuidFor(`rate-content:${item.slug}:technical`);
        await tx.insert(productContentSections).values({ id: sectionId, productId, title: "Technical specifications", sortOrder: 0 }).onConflictDoUpdate({ target: productContentSections.id, set: { title: "Technical specifications", sortOrder: 0, updatedAt: new Date() } });
        const content = [item.size ? `Size: ${item.size}` : null, item.referenceQuantity ? `Reference quantity: ${item.referenceQuantity.toLocaleString("en-IN")}` : null, item.productionTime ? `Production: ${item.productionTime}` : null].filter(Boolean).join(" · ") || "Configured from the current RATE.xlsx source.";
        await tx.insert(productContentItems).values({ id: uuidFor(`rate-content-item:${item.slug}:technical`), sectionId, label: "Current specification", content, sortOrder: 0 }).onConflictDoUpdate({ target: productContentItems.id, set: { label: "Current specification", content, sortOrder: 0, updatedAt: new Date() } });
      }
    }
  });

  const productCount = rateCatalog.reduce((sum, category) => sum + category.items.length, 0);
  console.log(`Seeded RATE.xlsx catalog: ${rateCatalog.length} active categories and ${productCount} active configurations.`);
  console.log("Ambiguity retained: Art Card displayed rates differ from workbook formula multipliers; formulas drive pricing and displayed source rates remain in metadata.");
  console.log("Delivery defaults (GJ 80 / other states 120) and NT Single outside-Ahmedabad surcharge 10 remain admin-configurable business settings.");
  await pool.end();
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
