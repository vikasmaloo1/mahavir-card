import { randomUUID } from "node:crypto";

import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

const baseUrl = process.env.STORAGE_TEST_BASE_URL || "http://localhost:3001";
const trustedOrigin = process.env.BETTER_AUTH_URL || baseUrl;
const email = process.env.INITIAL_ADMIN_EMAIL;
const password = process.env.INITIAL_ADMIN_PASSWORD;
if (!email || !password) throw new Error("INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD are required for the authenticated storage API test.");

function data(value: unknown): Record<string, unknown> { return value && typeof value === "object" ? value as Record<string, unknown> : {}; }
function list(value: unknown): Record<string, unknown>[] { const result = data(value).data; return Array.isArray(result) ? result as Record<string, unknown>[] : Array.isArray(data(result).items) ? data(result).items as Record<string, unknown>[] : []; }
function id(value: Record<string, unknown>) { return String(value.id || ""); }

async function main() {
  const signIn = await fetch(`${baseUrl}/api/auth/sign-in/email`, { method: "POST", headers: { "Content-Type": "application/json", Origin: trustedOrigin }, body: JSON.stringify({ email, password }) });
  if (!signIn.ok) throw new Error(`Admin sign-in failed with HTTP ${signIn.status}`);
  const setCookies = typeof signIn.headers.getSetCookie === "function" ? signIn.headers.getSetCookie() : [signIn.headers.get("set-cookie") || ""];
  const cookie = setCookies.filter(Boolean).map((item) => item.split(";", 1)[0]).join("; ");
  if (!cookie) throw new Error("Admin sign-in did not return a session cookie");

  async function api(path: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers); headers.set("Cookie", cookie); headers.set("Origin", trustedOrigin);
    const response = await fetch(`${baseUrl}${path}`, { ...options, headers, redirect: "manual" });
    const payload = response.status === 302 || response.status === 307 ? null : await response.json().catch(() => null);
    if (!response.ok && response.status !== 302 && response.status !== 307) throw new Error(`${options.method || "GET"} ${path} failed with HTTP ${response.status}: ${data(data(payload).error).message || "request failed"}`);
    return { response, payload };
  }

  const created: { productImage?: { productId: string; imageId: string; priorImageUrl?: string }; categoryImage?: { categoryId: string; imageId: string }; brandingId?: string; documentId?: string; artworkId?: string } = {};
  const cleanupFailures: string[] = [];
  async function cleanup(label: string, action: () => Promise<unknown>) { try { await action(); } catch { cleanupFailures.push(label); } }
  try {
    const products = list((await api("/api/admin/products?limit=100")).payload);
    const categories = list((await api("/api/admin/categories")).payload);
    const activeCategory = categories.find((item) => item.isActive === true);
    if (!products[0] || !activeCategory) throw new Error("An active product and category are required for storage API verification");

    const productId = id(products[0]); const product = data((await api(`/api/admin/products/${productId}`)).payload).data as Record<string, unknown>;
    const productImage = new FormData(); productImage.append("file", new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], { type: "image/png" }), "r2-product-test.png"); productImage.append("altText", "R2 verification");
    const uploadedProductImage = data((await api(`/api/admin/products/${productId}/images`, { method: "POST", body: productImage })).payload).data as Record<string, unknown>;
    created.productImage = { productId, imageId: id(uploadedProductImage), priorImageUrl: typeof product.imageUrl === "string" ? product.imageUrl : undefined };
    const replacement = new FormData(); replacement.append("file", new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01])], { type: "image/png" }), "r2-product-replacement.png");
    await api(`/api/admin/products/${productId}/images/${created.productImage.imageId}`, { method: "PATCH", body: replacement });
    const productFile = await fetch(`${baseUrl}/api/products/${productId}/images/${created.productImage.imageId}/file`, { redirect: "follow" });
    if (!productFile.ok) throw new Error("Public product image download failed");

    const categoryId = id(activeCategory); const categoryImage = new FormData(); categoryImage.append("file", new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: "image/jpeg" }), "r2-category-test.jpg"); categoryImage.append("isPrimary", "true");
    const uploadedCategoryImage = data((await api(`/api/admin/categories/${categoryId}/images`, { method: "POST", body: categoryImage })).payload).data as Record<string, unknown>;
    created.categoryImage = { categoryId, imageId: id(uploadedCategoryImage) };
    const categoryFile = await fetch(`${baseUrl}/api/categories/${categoryId}/images/${created.categoryImage.imageId}/file`, { redirect: "follow" });
    if (!categoryFile.ok) throw new Error("Public category image download failed");

    const branding = new FormData(); branding.append("file", new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], { type: "image/png" }), "r2-brand-test.png"); branding.append("assetKey", `verification.${randomUUID()}`); branding.append("assetType", "ASSET");
    const uploadedBranding = data((await api("/api/admin/branding/assets", { method: "POST", body: branding })).payload).data as Record<string, unknown>; created.brandingId = id(uploadedBranding);
    const brandingFile = await fetch(`${baseUrl}${String(uploadedBranding.imageUrl)}`, { redirect: "follow" }); if (!brandingFile.ok) throw new Error("Public branding download failed");

    const entityId = randomUUID(); const documentForm = new FormData(); documentForm.append("file", new Blob([new TextEncoder().encode("%PDF-1.7\nR2 verification")], { type: "application/pdf" }), "r2-document-test.pdf"); documentForm.append("documentType", "OTHER"); documentForm.append("entityType", "VERIFICATION"); documentForm.append("entityId", entityId);
    const uploadedDocument = data((await api("/api/admin/documents", { method: "POST", body: documentForm })).payload).data as Record<string, unknown>; created.documentId = id(uploadedDocument);
    const documentRedirect = await api(`/api/admin/documents/${created.documentId}/download`); const documentFile = await fetch(documentRedirect.response.headers.get("location") || ""); if (!documentFile.ok) throw new Error("Private document signed download failed");

    let artworkProduct: Record<string, unknown> | undefined;
    let pricingRuleId: string | null = null;
    let artworkSlot: Record<string, unknown> | undefined;
    for (const candidate of products) {
      const catalog = data((await api(`/api/admin/products/${id(candidate)}/catalog`)).payload).data as Record<string, unknown>;
      const requirements = Array.isArray(catalog.artworkRequirements) ? catalog.artworkRequirements as Record<string, unknown>[] : [];
      const pricingRules = Array.isArray(catalog.pricingRules) ? catalog.pricingRules as Record<string, unknown>[] : [];
      for (const rule of pricingRules) {
        const requirement = requirements.find((item) => item.pricingRuleId === id(rule) && Array.isArray(item.slots) && item.slots.length > 0);
        const slot = requirement && Array.isArray(requirement.slots) ? requirement.slots[0] as Record<string, unknown> : undefined;
        if (requirement && slot) {
          artworkProduct = candidate;
          pricingRuleId = id(rule);
          artworkSlot = slot;
          break;
        }
      }
      if (artworkProduct) break;
    }
    if (!artworkProduct || !artworkSlot) throw new Error("No priced product with an artwork slot was available for CDR verification");
    const cdr = new TextEncoder().encode("CorelDRAW verification object");
    const started = data((await api("/api/artworks/upload-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: id(artworkProduct), pricingRuleId, artworkSlotId: id(artworkSlot), artworkSlotKey: artworkSlot.slotKey, filename: "r2-artwork-test.cdr", contentType: "application/octet-stream", fileSize: cdr.byteLength, configuration: {} }) })).payload).data as Record<string, unknown>;
    created.artworkId = id(data(started.artwork)); const directUpload = await fetch(String(started.uploadUrl), { method: "PUT", headers: started.headers as HeadersInit, body: cdr }); if (!directUpload.ok) throw new Error("Presigned CDR API upload failed");
    await api(`/api/artworks/${created.artworkId}/finalize`, { method: "POST" });
    const artworkRedirect = await api(`/api/artworks/${created.artworkId}/download`); const artworkFile = await fetch(artworkRedirect.response.headers.get("location") || ""); if (!artworkFile.ok) throw new Error("Private CDR signed download failed");

    console.log("Storage API verification passed: product/category/branding images, private PDF, and private CDR upload/download flows.");
  } finally {
    if (created.artworkId) await cleanup("artwork", () => api(`/api/artworks/${created.artworkId}`, { method: "DELETE" }));
    if (created.documentId) await cleanup("document", () => api(`/api/admin/documents/${created.documentId}`, { method: "DELETE" }));
    if (created.brandingId) await cleanup("branding", () => api(`/api/admin/branding/assets/${created.brandingId}`, { method: "DELETE" }));
    if (created.categoryImage) await cleanup("category image", () => api(`/api/admin/categories/${created.categoryImage!.categoryId}/images/${created.categoryImage!.imageId}`, { method: "DELETE" }));
    if (created.productImage) {
      await cleanup("product image", () => api(`/api/admin/products/${created.productImage!.productId}/images/${created.productImage!.imageId}`, { method: "DELETE" }));
      if (created.productImage.priorImageUrl) await cleanup("product image restoration", () => api(`/api/admin/products/${created.productImage!.productId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: created.productImage!.priorImageUrl }) }));
    }
    if (cleanupFailures.length) throw new Error(`Storage API verification cleanup failed for: ${cleanupFailures.join(", ")}`);
    console.log("Storage API verification cleanup finished.");
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Storage API verification failed"); process.exitCode = 1; });
