import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

import {
  CATALOG_MODE_LABELS,
  type CatalogBusinessInfo,
  type CatalogCategory,
  type CatalogCustomService,
  type CatalogModel,
  type CatalogPriceMode,
  type CatalogProduct,
} from "@/lib/catalog-model";
import { buildPriceView, stripPriceText } from "@/lib/catalog-pricing";

/**
 * Vector catalogue PDF built with pdf-lib: text is real text (selectable, sharp at any zoom),
 * rules and panels are vector, and only the product photographs are raster. Nothing here
 * screenshots the browser — both this and /catalog render from the same CatalogModel.
 */

// Card height is shared by the renderer and the row-pagination maths so a card is never
// started in a space it cannot fully occupy.
const CARD_H = 196;

// A4 portrait, 72pt per inch.
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 38;
const HEADER_H = 52;
const FOOTER_H = 34;
const CONTENT_TOP = PAGE_H - MARGIN - HEADER_H;
const CONTENT_BOTTOM = MARGIN + FOOTER_H;

const INK = rgb(0.035, 0.098, 0.18); // #09192e
const GOLD = rgb(0.773, 0.608, 0.153); // #c59b27
const SLATE = rgb(0.404, 0.447, 0.51);
const LIGHT = rgb(0.945, 0.957, 0.969);
const LINE = rgb(0.85, 0.87, 0.9);
const WHITE = rgb(1, 1, 1);

type Fonts = { regular: PDFFont; bold: PDFFont };

/** pdf-lib's standard fonts are WinAnsi — strip anything they cannot encode (₹, emoji, en-dash). */
function ascii(value: string) {
  return value
    .replace(/[₹]/g, "Rs ")
    .replace(/[×✕✖]/g, "x")
    .replace(/[–—]/g, "-")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/·/g, "-")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function fit(text: string, font: PDFFont, size: number, maxWidth: number) {
  const clean = ascii(text);
  if (font.widthOfTextAtSize(clean, size) <= maxWidth) return clean;
  let out = clean;
  while (out.length > 1 && font.widthOfTextAtSize(out + "...", size) > maxWidth) out = out.slice(0, -1);
  return out.trimEnd() + "...";
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number, maxLines: number) {
  const words = ascii(text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    if (font.widthOfTextAtSize(last, size) > maxWidth - 12) lines[maxLines - 1] = fit(last, font, size, maxWidth);
  }
  return lines;
}

function drawText(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number, color = INK) {
  page.drawText(ascii(text), { x, y, font, size, color });
}

function drawRight(page: PDFPage, text: string, right: number, y: number, font: PDFFont, size: number, color = INK) {
  const clean = ascii(text);
  page.drawText(clean, { x: right - font.widthOfTextAtSize(clean, size), y, font, size, color });
}

function drawCentered(page: PDFPage, text: string, center: number, y: number, font: PDFFont, size: number, color = INK) {
  const clean = ascii(text);
  page.drawText(clean, { x: center - font.widthOfTextAtSize(clean, size) / 2, y, font, size, color });
}

/** Loads and embeds a /public image once, reusing the embed across every page that needs it. */
async function loadImages(pdf: PDFDocument, urls: string[]) {
  const cache = new Map<string, PDFImage | null>();
  await Promise.all(
    [...new Set(urls)].map(async (url) => {
      try {
        const relative = url.replace(/^\//, "");
        const file = await readFile(path.join(process.cwd(), "public", relative));
        const bytes = new Uint8Array(file);
        const lower = url.toLowerCase();
        const image = lower.endsWith(".png")
          ? await pdf.embedPng(bytes)
          : lower.endsWith(".jpg") || lower.endsWith(".jpeg")
            ? await pdf.embedJpg(bytes)
            : null;
        cache.set(url, image);
      } catch {
        cache.set(url, null);
      }
    }),
  );
  return cache;
}

/**
 * Contain-fit: scales the photo to sit fully inside the box, centred, preserving aspect ratio.
 * Cover-fit would need clipping to hide the overflow, which pdf-lib cannot do — the excess
 * would paint over the card text and the neighbouring column.
 */
function containRect(image: PDFImage, boxW: number, boxH: number) {
  const scale = Math.min(boxW / image.width, boxH / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  return { w, h, dx: (boxW - w) / 2, dy: (boxH - h) / 2 };
}

type Ctx = {
  pdf: PDFDocument;
  fonts: Fonts;
  business: CatalogBusinessInfo;
  mode: CatalogPriceMode;
  images: Map<string, PDFImage | null>;
  pages: PDFPage[];
};

function newPage(ctx: Ctx, sectionTitle: string) {
  const page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
  ctx.pages.push(page);
  const { regular, bold } = ctx.fonts;

  // Repeating header band.
  page.drawRectangle({ x: 0, y: PAGE_H - MARGIN - HEADER_H + 14, width: PAGE_W, height: HEADER_H - 6, color: INK });
  page.drawRectangle({ x: 0, y: PAGE_H - MARGIN - HEADER_H + 14, width: PAGE_W, height: 2.5, color: GOLD });
  drawText(page, ctx.business.name, MARGIN, PAGE_H - MARGIN - 8, bold, 13, WHITE);
  drawText(page, "Commercial Offset Printing - Ahmedabad", MARGIN, PAGE_H - MARGIN - 21, regular, 7.5, GOLD);
  drawRight(page, sectionTitle, PAGE_W - MARGIN, PAGE_H - MARGIN - 8, bold, 9, WHITE);
  drawRight(page, CATALOG_MODE_LABELS[ctx.mode], PAGE_W - MARGIN, PAGE_H - MARGIN - 20, regular, 7, GOLD);
  return page;
}

function drawFooters(ctx: Ctx) {
  const { regular, bold } = ctx.fonts;
  const total = ctx.pages.length;
  ctx.pages.forEach((page, index) => {
    if (index === 0) return; // cover carries its own footer
    page.drawLine({
      start: { x: MARGIN, y: CONTENT_BOTTOM - 8 },
      end: { x: PAGE_W - MARGIN, y: CONTENT_BOTTOM - 8 },
      thickness: 0.6,
      color: LINE,
    });
    // Both numbers ride the repeating footer so any single page is enough to call from.
    const footerContact = `${ctx.business.website}  |  ${ctx.business.primaryPhone}  |  ${ctx.business.whatsappPhone}`;
    drawText(page, footerContact, MARGIN, CONTENT_BOTTOM - 20, regular, 7, SLATE);
    drawCentered(page, `GSTIN ${ctx.business.gstin}`, PAGE_W / 2, CONTENT_BOTTOM - 20, regular, 7, SLATE);
    drawRight(page, `Page ${index + 1} of ${total}`, PAGE_W - MARGIN, CONTENT_BOTTOM - 20, bold, 7, INK);
  });
}

function drawCover(ctx: Ctx, model: CatalogModel) {
  const page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
  ctx.pages.push(page);
  const { regular, bold } = ctx.fonts;
  const b = ctx.business;

  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: INK });
  page.drawRectangle({ x: 0, y: PAGE_H - 10, width: PAGE_W, height: 10, color: GOLD });

  const logo = ctx.images.get("/images/mahavir-card-logo.jpeg");
  if (logo) {
    const size = 74;
    const { w, h, dx, dy } = containRect(logo, size, size);
    page.drawRectangle({ x: MARGIN, y: PAGE_H - 175, width: size, height: size, color: WHITE });
    page.drawImage(logo, { x: MARGIN + dx, y: PAGE_H - 175 + dy, width: w, height: h });
  }

  drawText(page, b.name, MARGIN, PAGE_H - 232, bold, 40, WHITE);
  drawText(page, ascii(b.tagline), MARGIN, PAGE_H - 254, regular, 11, GOLD);

  page.drawLine({ start: { x: MARGIN, y: PAGE_H - 278 }, end: { x: MARGIN + 150, y: PAGE_H - 278 }, thickness: 2, color: GOLD });

  drawText(page, "OFFICIAL PRODUCT", MARGIN, PAGE_H - 330, bold, 30, WHITE);
  drawText(page, "CATALOGUE", MARGIN, PAGE_H - 366, bold, 30, WHITE);

  // Mode badge — states plainly which edition this is.
  const badge = CATALOG_MODE_LABELS[ctx.mode].toUpperCase();
  const badgeW = bold.widthOfTextAtSize(ascii(badge), 9) + 22;
  page.drawRectangle({ x: MARGIN, y: PAGE_H - 400, width: badgeW, height: 20, color: GOLD });
  drawText(page, badge, MARGIN + 11, PAGE_H - 394, bold, 9, INK);

  const blurb =
    ctx.mode === "SHOWROOM"
      ? "Complete product range with specifications and finishes. Pricing available on enquiry."
      : "Complete product range with specifications, finishes and current rates for trade and retail buyers.";
  wrap(blurb, regular, 10.5, PAGE_W - MARGIN * 2 - 90, 3).forEach((line, i) => {
    drawText(page, line, MARGIN, PAGE_H - 430 - i * 15, regular, 10.5, rgb(0.78, 0.82, 0.87));
  });

  const stats: Array<[string, string]> = [
    [String(model.totalProducts), "Products"],
    [String(model.categories.length), "Categories"],
    ["25+", "Years"],
  ];
  stats.forEach(([value, label], i) => {
    const x = MARGIN + i * 108;
    drawText(page, value, x, 250, bold, 26, GOLD);
    drawText(page, label.toUpperCase(), x, 234, regular, 8, rgb(0.7, 0.75, 0.82));
  });

  page.drawLine({ start: { x: MARGIN, y: 208 }, end: { x: PAGE_W - MARGIN, y: 208 }, thickness: 0.8, color: rgb(0.2, 0.26, 0.34) });

  const contact = [
    `${b.address}, ${b.city} - ${b.postalCode}, ${b.state}`,
    `Phone / WhatsApp: ${b.primaryPhone}  |  ${b.whatsappPhone}`,
    `${b.email}  |  ${b.website}`,
    `GSTIN ${b.gstin}`,
  ];
  contact.forEach((line, i) => drawText(page, line, MARGIN, 180 - i * 14, regular, 9, rgb(0.78, 0.82, 0.87)));

  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: 6, color: GOLD });
}

/** One product card. Returns the height consumed. */
function drawProductCard(ctx: Ctx, page: PDFPage, product: CatalogProduct, x: number, top: number, width: number) {
  const { regular, bold } = ctx.fonts;
  const imageH = 86;
  const cardH = CARD_H;
  const y = top - cardH;

  page.drawRectangle({ x, y, width, height: cardH, color: WHITE, borderColor: LINE, borderWidth: 0.8 });

  // Photo (or a neutral placeholder — never a substituted image).
  const image = ctx.images.get(product.imageUrl);
  if (image && !product.imageIsPlaceholder) {
    const { w, h, dx, dy } = containRect(image, width, imageH);
    page.drawRectangle({ x, y: top - imageH, width, height: imageH, color: LIGHT });
    page.drawImage(image, { x: x + dx, y: top - imageH + dy, width: w, height: h });
  } else {
    page.drawRectangle({ x, y: top - imageH, width, height: imageH, color: LIGHT });
    drawCentered(page, "PHOTOGRAPH ON REQUEST", x + width / 2, top - imageH / 2 - 3, regular, 7.5, SLATE);
  }
  page.drawLine({ start: { x, y: top - imageH }, end: { x: x + width, y: top - imageH }, thickness: 0.8, color: LINE });

  const pad = 9;
  const innerW = width - pad * 2;
  let cursor = top - imageH - 15;

  wrap(product.name, bold, 9.5, innerW, 2).forEach((line) => {
    drawText(page, line, x + pad, cursor, bold, 9.5, INK);
    cursor -= 11.5;
  });

  // In showroom mode, scrub any figure embedded in the description itself.
  const description =
    ctx.mode === "SHOWROOM" && product.shortDescription
      ? stripPriceText(product.shortDescription)
      : product.shortDescription;
  if (description) {
    cursor -= 1;
    wrap(description, regular, 7.3, innerW, 2).forEach((line) => {
      drawText(page, line, x + pad, cursor, regular, 7.3, SLATE);
      cursor -= 9;
    });
  }

  // Specification chips (non-price, shown in every mode).
  const chips = [product.size, product.productionTime, product.addon ? `+ ${product.addon.name}` : null]
    .filter((chip): chip is string => Boolean(chip))
    .slice(0, 2);
  if (chips.length) {
    cursor -= 3;
    let chipX = x + pad;
    for (const chip of chips) {
      const label = fit(chip, regular, 6.6, innerW / 2 - 6);
      const chipW = regular.widthOfTextAtSize(label, 6.6) + 10;
      if (chipX + chipW > x + width - pad) break;
      page.drawRectangle({ x: chipX, y: cursor - 3, width: chipW, height: 12, color: LIGHT });
      drawText(page, label, chipX + 5, cursor, regular, 6.6, SLATE);
      chipX += chipW + 4;
    }
    cursor -= 14;
  }

  // Price panel, pinned to the card foot so every card aligns.
  const view = buildPriceView(product, ctx.mode);
  const panelY = y + 7;
  const panelH = 38;
  page.drawRectangle({ x: x + pad, y: panelY, width: innerW, height: panelH, color: LIGHT });

  if (view.primary) {
    drawText(page, (view.primaryLabel ?? "").toUpperCase(), x + pad + 7, panelY + panelH - 11, bold, 6.3, SLATE);
    drawText(page, view.primary, x + pad + 7, panelY + panelH - 25, bold, 11, INK);
    if (view.breakdown.length) {
      const parts = view.breakdown.map((row) => `${row.label} ${row.value}`).join("   |   ");
      drawText(page, fit(parts, regular, 6.4, innerW - 14), x + pad + 6, panelY + 6, regular, 6.4, SLATE);
    } else {
      drawText(page, fit(view.batchLabel, regular, 6.4, innerW - 14), x + pad + 6, panelY + 6, regular, 6.4, SLATE);
    }
  } else {
    // Showroom: no monetary value exists on the view object at all.
    drawText(page, "SHOWROOM DISPLAY", x + pad + 7, panelY + panelH - 11, bold, 6.3, GOLD);
    drawText(page, "ENQUIRE FOR PRICING", x + pad + 7, panelY + panelH - 25, bold, 10, INK);
    drawText(page, fit(view.batchLabel, regular, 6.4, innerW - 14), x + pad + 6, panelY + 6, regular, 6.4, SLATE);
  }

  if (view.bladeNote) {
    drawRight(page, fit(view.bladeNote, regular, 6.2, innerW / 2), x + width - pad - 4, panelY + panelH + 4, regular, 6.2, SLATE);
  }

  return cardH;
}

function drawCategory(ctx: Ctx, category: CatalogCategory, startPage: PDFPage | null) {
  const { regular, bold } = ctx.fonts;
  const columns = 2;
  const gutter = 16;
  const cardW = (PAGE_W - MARGIN * 2 - gutter * (columns - 1)) / columns;
  const cardH = CARD_H;
  const rowGap = 13;

  let page = startPage ?? newPage(ctx, category.name);
  let cursor = CONTENT_TOP - 6;

  // Category masthead.
  page.drawRectangle({ x: MARGIN, y: cursor - 34, width: PAGE_W - MARGIN * 2, height: 34, color: INK });
  page.drawRectangle({ x: MARGIN, y: cursor - 34, width: 4, height: 34, color: GOLD });
  drawText(page, category.name.toUpperCase(), MARGIN + 14, cursor - 15, bold, 13, WHITE);
  drawRight(page, `${category.products.length} products`, PAGE_W - MARGIN - 12, cursor - 15, regular, 8, GOLD);
  const desc = wrap(category.description, regular, 7, PAGE_W - MARGIN * 2 - 130, 1)[0];
  if (desc) drawText(page, desc, MARGIN + 14, cursor - 27, regular, 7, rgb(0.72, 0.77, 0.83));
  cursor -= 34 + 14;

  category.products.forEach((product, index) => {
    const column = index % columns;
    if (column === 0 && cursor - cardH < CONTENT_BOTTOM) {
      // Not enough room for another full row — start a fresh page rather than clipping a card.
      page = newPage(ctx, `${category.name} (cont.)`);
      cursor = CONTENT_TOP - 6;
    }
    const x = MARGIN + column * (cardW + gutter);
    drawProductCard(ctx, page, product, x, cursor, cardW);
    if (column === columns - 1) cursor -= cardH + rowGap;
  });

  if (category.products.length % columns !== 0) cursor -= cardH + rowGap;
  return { page, cursor };
}

/**
 * Custom / commercial work, laid out as full-width rows because each entry carries three
 * specification lines that will not fit a product-card column. These items are quoted per
 * specification, so they are identical in every mode — there is no price to suppress.
 */
const SERVICE_H = 126;

function drawCustomServiceRow(ctx: Ctx, page: PDFPage, service: CatalogCustomService, top: number) {
  const { regular, bold } = ctx.fonts;
  const width = PAGE_W - MARGIN * 2;
  const y = top - SERVICE_H;
  const imageW = 148;

  page.drawRectangle({ x: MARGIN, y, width, height: SERVICE_H, color: WHITE, borderColor: LINE, borderWidth: 0.8 });

  const image = ctx.images.get(service.image);
  page.drawRectangle({ x: MARGIN, y, width: imageW, height: SERVICE_H, color: LIGHT });
  if (image) {
    const { w, h, dx, dy } = containRect(image, imageW, SERVICE_H);
    page.drawImage(image, { x: MARGIN + dx, y: y + dy, width: w, height: h });
  } else {
    drawCentered(page, "PHOTOGRAPH ON REQUEST", MARGIN + imageW / 2, y + SERVICE_H / 2, regular, 7, SLATE);
  }
  page.drawLine({ start: { x: MARGIN + imageW, y }, end: { x: MARGIN + imageW, y: top }, thickness: 0.8, color: LINE });

  const textX = MARGIN + imageW + 12;
  const innerW = width - imageW - 24;
  let cursor = top - 16;

  drawText(page, fit(service.title, bold, 10, innerW), textX, cursor, bold, 10, INK);
  cursor -= 11;
  drawText(page, fit(service.subtitle, regular, 7, innerW), textX, cursor, regular, 7, GOLD);
  cursor -= 13;

  for (const spec of service.specs) {
    const lines = wrap(spec, regular, 7, innerW - 8, 2);
    page.drawCircle({ x: textX + 2, y: cursor + 2.5, size: 1.4, color: GOLD });
    lines.forEach((line, i) => drawText(page, line, textX + 8, cursor - i * 8.5, regular, 7, SLATE));
    cursor -= lines.length * 8.5 + 2.5;
  }

  // Footer chips: sizes, turnaround, and the quote CTA that replaces a rate.
  const chipY = y + 8;
  let chipX = textX;
  for (const chip of [service.sizes, service.turnaround]) {
    const label = fit(chip, regular, 6.4, innerW / 2);
    const chipW = regular.widthOfTextAtSize(label, 6.4) + 10;
    if (chipX + chipW > MARGIN + width - 12) break;
    page.drawRectangle({ x: chipX, y: chipY - 3, width: chipW, height: 12, color: LIGHT });
    drawText(page, label, chipX + 5, chipY, regular, 6.4, SLATE);
    chipX += chipW + 5;
  }
  drawRight(page, "ENQUIRE FOR CUSTOM SPEC QUOTE", MARGIN + width - 12, chipY, bold, 6.4, GOLD);

  return SERVICE_H;
}

function drawCustomServices(ctx: Ctx, services: CatalogCustomService[]) {
  const { regular, bold } = ctx.fonts;
  const section = "Custom & Specialty Print Solutions";
  let page = newPage(ctx, section);
  let cursor = CONTENT_TOP - 6;

  page.drawRectangle({ x: MARGIN, y: cursor - 34, width: PAGE_W - MARGIN * 2, height: 34, color: INK });
  page.drawRectangle({ x: MARGIN, y: cursor - 34, width: 4, height: 34, color: GOLD });
  drawText(page, section.toUpperCase(), MARGIN + 14, cursor - 15, bold, 13, WHITE);
  drawRight(page, `${services.length} solutions`, PAGE_W - MARGIN - 12, cursor - 15, regular, 8, GOLD);
  drawText(page, "Quoted per specification - share your requirement for a costing", MARGIN + 14, cursor - 27, regular, 7, rgb(0.72, 0.77, 0.83));
  cursor -= 34 + 14;

  for (const service of services) {
    if (cursor - SERVICE_H < CONTENT_BOTTOM) {
      page = newPage(ctx, `${section} (cont.)`);
      cursor = CONTENT_TOP - 6;
    }
    drawCustomServiceRow(ctx, page, service, cursor);
    cursor -= SERVICE_H + 12;
  }
}

function drawClosing(ctx: Ctx, model: CatalogModel) {
  const page = newPage(ctx, "Artwork & Contact");
  const { regular, bold } = ctx.fonts;
  const b = ctx.business;
  let cursor = CONTENT_TOP - 10;

  drawText(page, "ARTWORK & PRE-PRESS GUIDELINES", MARGIN, cursor, bold, 14, INK);
  cursor -= 8;
  page.drawLine({ start: { x: MARGIN, y: cursor }, end: { x: MARGIN + 120, y: cursor }, thickness: 2, color: GOLD });
  cursor -= 22;

  // Only guidance already published in the application (artwork guide / catalogue copy).
  const guidelines: Array<[string, string]> = [
    ["Accepted files", "CorelDRAW (.CDR) preferred. Convert all fonts to curves before sending."],
    ["Colour mode", "CMYK with minimum 300 DPI resolution for sharp offset reproduction."],
    ["Bleed & safe area", "Keep critical text inside the safe area; extend backgrounds into the bleed."],
    ["Proofing", "A digital proof is shared for approval before the plate is made."],
    ["Delivery", "Dispatch across Gujarat and Rajasthan; local delivery in Ahmedabad."],
  ];
  for (const [title, body] of guidelines) {
    drawText(page, title, MARGIN, cursor, bold, 9, INK);
    const lines = wrap(body, regular, 8.5, PAGE_W - MARGIN * 2 - 110, 2);
    lines.forEach((line, i) => drawText(page, line, MARGIN + 105, cursor - i * 11, regular, 8.5, SLATE));
    cursor -= Math.max(18, lines.length * 11 + 7);
  }

  cursor -= 10;
  page.drawRectangle({ x: MARGIN, y: cursor - 128, width: PAGE_W - MARGIN * 2, height: 128, color: INK });
  page.drawRectangle({ x: MARGIN, y: cursor - 128, width: PAGE_W - MARGIN * 2, height: 3, color: GOLD });
  drawText(page, "PLACE AN ORDER OR REQUEST A QUOTATION", MARGIN + 18, cursor - 26, bold, 12, WHITE);

  const contact = [
    `${b.address}`,
    `${b.city} - ${b.postalCode}, ${b.state}`,
    `Phone: ${b.primaryPhone}   WhatsApp: ${b.whatsappPhone}`,
    `Email: ${b.email}`,
    `Website: ${b.website}`,
    `GSTIN: ${b.gstin}`,
  ];
  contact.forEach((line, i) => drawText(page, line, MARGIN + 18, cursor - 48 - i * 13, regular, 9, rgb(0.8, 0.84, 0.89)));

  cursor -= 148;
  const note =
    ctx.mode === "SHOWROOM"
      ? "This showroom edition lists products and specifications only. Contact us for current rates and quotations."
      : "Rates shown are current at the time of printing and exclude GST unless stated otherwise.";
  wrap(note, regular, 8, PAGE_W - MARGIN * 2, 2).forEach((line, i) =>
    drawText(page, line, MARGIN, cursor - i * 11, regular, 8, SLATE),
  );

  if (model.productsWithoutImages.length) {
    // Reported honestly rather than filled with an unrelated photo.
    cursor -= 26;
    drawText(
      page,
      fit(`${model.productsWithoutImages.length} item(s) show "photograph on request".`, regular, 7.5, PAGE_W - MARGIN * 2),
      MARGIN,
      cursor,
      regular,
      7.5,
      SLATE,
    );
  }
}

export async function generateCatalogPdf(model: CatalogModel, mode: CatalogPriceMode): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${model.businessInfo.name} Product Catalogue - ${CATALOG_MODE_LABELS[mode]}`);
  pdf.setAuthor(model.businessInfo.name);
  pdf.setSubject(CATALOG_MODE_LABELS[mode]);
  pdf.setProducer("mahavircard.in");
  pdf.setCreationDate(new Date());

  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };

  const imageUrls = [
    "/images/mahavir-card-logo.jpeg",
    ...model.categories.flatMap((category) => category.products.map((product) => product.imageUrl)),
    ...model.customServices.map((service) => service.image),
  ];
  const images = await loadImages(pdf, imageUrls);

  const ctx: Ctx = { pdf, fonts, business: model.businessInfo, mode, images, pages: [] };

  drawCover(ctx, model);
  for (const category of model.categories) {
    if (!category.products.length) continue;
    drawCategory(ctx, category, null);
  }
  if (model.customServices.length) drawCustomServices(ctx, model.customServices);
  drawClosing(ctx, model);
  drawFooters(ctx);

  return pdf.save();
}
