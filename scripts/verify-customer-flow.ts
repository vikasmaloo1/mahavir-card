import { config as loadEnv } from "dotenv";
import { and, eq, ilike, or } from "drizzle-orm";

import { admins, artworks, customers, inquiries, orders, quotes, user } from "../src/lib/db/schema";

loadEnv({ path: ".env.local", quiet: true });

const baseUrl = process.env.CUSTOMER_FLOW_BASE_URL || "http://localhost:3005";
const trustedOrigin = process.env.BETTER_AUTH_URL || baseUrl;
const marker = crypto.randomUUID().slice(0, 8);
const email = `customer-flow-${marker}@example.com`;
const adminEmail = `customer-flow-admin-${marker}@example.com`;
const password = `Flow-${crypto.randomUUID()}-9a`;
const createdArtworkIds: string[] = [];

type ObjectValue = Record<string, unknown>;
function object(value: unknown): ObjectValue { return value && typeof value === "object" ? value as ObjectValue : {}; }
function array(value: unknown): ObjectValue[] { return Array.isArray(value) ? value as ObjectValue[] : []; }
function data(value: unknown) { return object(object(value).data); }
function id(value: unknown) { return String(object(value).id || ""); }

async function main() {
  const [{ db, pool }, { storage }] = await Promise.all([import("../src/lib/db/index"), import("../src/lib/storage/index")]);

  const staleUsers = await db.select({ id: user.id }).from(user).where(ilike(user.email, "customer-flow-%@example.com"));
  for (const staleUser of staleUsers) {
    const staleArtwork = await db.select({ storageKey: artworks.storageKey }).from(artworks).where(eq(artworks.uploadedBy, staleUser.id));
    await Promise.all(staleArtwork.map((item) => item.storageKey ? storage.deleteObject(item.storageKey).catch(() => undefined) : Promise.resolve()));
    const [staleCustomer] = await db.select({ id: customers.id }).from(customers).where(eq(customers.userId, staleUser.id)).limit(1);
    if (staleCustomer) {
      await db.delete(orders).where(eq(orders.customerId, staleCustomer.id));
      await db.delete(quotes).where(or(eq(quotes.userId, staleUser.id), eq(quotes.customerId, staleCustomer.id)));
      await db.delete(inquiries).where(eq(inquiries.customerId, staleCustomer.id));
      await db.delete(artworks).where(eq(artworks.customerId, staleCustomer.id));
      await db.delete(customers).where(eq(customers.id, staleCustomer.id));
    } else {
      await db.delete(quotes).where(eq(quotes.userId, staleUser.id));
      await db.delete(artworks).where(eq(artworks.uploadedBy, staleUser.id));
    }
    await db.delete(user).where(eq(user.id, staleUser.id));
  }

  const signUp = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: trustedOrigin },
    body: JSON.stringify({ name: "Customer Flow Test", email, password }),
  });
  if (!signUp.ok) throw new Error(`Temporary customer signup failed with HTTP ${signUp.status}`);
  const setCookies = typeof signUp.headers.getSetCookie === "function" ? signUp.headers.getSetCookie() : [signUp.headers.get("set-cookie") || ""];
  const cookie = setCookies.filter(Boolean).map((value) => value.split(";", 1)[0]).join("; ");
  if (!cookie) throw new Error("Temporary customer signup did not return a session cookie");

  const adminSignUp = await fetch(`${baseUrl}/api/auth/sign-up/email`, { method: "POST", headers: { "Content-Type": "application/json", Origin: trustedOrigin }, body: JSON.stringify({ name: "Customer Flow Admin", email: adminEmail, password }) });
  if (!adminSignUp.ok) throw new Error(`Temporary admin signup failed with HTTP ${adminSignUp.status}`);
  const adminCookies = typeof adminSignUp.headers.getSetCookie === "function" ? adminSignUp.headers.getSetCookie() : [adminSignUp.headers.get("set-cookie") || ""];
  const adminCookie = adminCookies.filter(Boolean).map((value) => value.split(";", 1)[0]).join("; ");
  const [adminUser] = await db.select({ id: user.id }).from(user).where(eq(user.email, adminEmail)).limit(1);
  if (!adminCookie || !adminUser) throw new Error("Temporary admin session was not created");
  await db.insert(admins).values({ userId: adminUser.id, status: "ACTIVE" });

  async function api(path: string, options: RequestInit = {}, expected = 200) {
    const headers = new Headers(options.headers);
    headers.set("Cookie", cookie);
    headers.set("Origin", trustedOrigin);
    const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
    const payload = await response.json().catch(() => null);
    if (response.status !== expected) throw new Error(`${options.method || "GET"} ${path} returned HTTP ${response.status}: ${String(object(object(payload).error).message || "request failed")}`);
    return payload;
  }

  async function adminApi(path: string, options: RequestInit = {}, expected = 200) {
    const headers = new Headers(options.headers);
    headers.set("Cookie", adminCookie);
    headers.set("Origin", trustedOrigin);
    if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
    const payload = await response.json().catch(() => null);
    if (response.status !== expected) throw new Error(`ADMIN ${options.method || "GET"} ${path} returned HTTP ${response.status}: ${String(object(object(payload).error).message || "request failed")}`);
    return payload;
  }

  try {
    const listing = data(await api("/api/products?orderable=true&quoteable=true&page=1&limit=50"));
    const listedProducts = array(listing.items);
    if (!listedProducts.length) throw new Error("No orderable and quoteable product is available for flow verification");

    const searchName = String(listedProducts[0].name || "").split(" ")[0];
    const search = data(await api(`/api/products?q=${encodeURIComponent(searchName)}&page=1&limit=12`));
    if (!array(search.items).length) throw new Error("Product search returned no matching API records");

    let product: ObjectValue | null = null;
    let rule: ObjectValue | null = null;
    let requirement: ObjectValue | null = null;
    for (const listed of listedProducts) {
      const detail = data(await api(`/api/products/${id(listed)}`));
      const candidate = array(detail.pricingRules).find((item) => Number(object(item.conditions).quantity) > 0 && Number(object(item.priceFormula).amount) > 0);
      const candidateRequirement = candidate ? array(detail.artworkRequirements).find((item) => item.pricingRuleId === id(candidate) && array(item.slots).length > 0) : null;
      if (candidate && candidateRequirement) { product = detail; rule = candidate; requirement = candidateRequirement; break; }
    }
    if (!product || !rule || !requirement) throw new Error("No priced product with artwork requirements is available for flow verification");

    const productId = id(product);
    const pricingRuleId = id(rule);
    const requiredSlots = array(requirement.slots).filter((item) => item.required !== false);
    const firstSlot = requiredSlots[0];
    if (!firstSlot) throw new Error("The selected artwork requirement has no required slots");
    const quantity = Number(object(rule.conditions).quantity);
    const matchingAddons = array(product.addons).filter((addon) => addon.pricingRuleId === pricingRuleId || addon.pricingRuleId === null);
    const addonIds = matchingAddons.length ? [String(matchingAddons[0].addonId)] : [];
    const deliveryRule = array(product.deliveryRules)[0];
    const delivery = deliveryRule ? { method: deliveryRule.deliveryMethod, stateCode: deliveryRule.stateCode || "*" } : undefined;

    await api("/api/artworks/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, pricingRuleId, artworkSlotId: id(firstSlot), artworkSlotKey: firstSlot.slotKey, filename: "rejected.pdf", contentType: "application/pdf", fileSize: 12, configuration: {} }),
    }, 422);

    const artworkIds: Record<string, string> = {};
    for (const slot of requiredSlots) {
      const cdr = new TextEncoder().encode(`CorelDRAW customer flow verification ${marker} ${String(slot.slotKey)}`);
      const started = data(await api("/api/artworks/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, pricingRuleId, artworkSlotId: id(slot), artworkSlotKey: slot.slotKey, filename: `customer-flow-${marker}-${String(slot.slotKey).toLowerCase()}.cdr`, contentType: "application/octet-stream", fileSize: cdr.byteLength, configuration: {} }),
      }, 201));
      const artworkId = id(started.artwork);
      if (!artworkId || !started.uploadUrl) throw new Error("CDR upload URL was not created");
      createdArtworkIds.push(artworkId);
      const uploaded = await fetch(String(started.uploadUrl), { method: "PUT", headers: started.headers as HeadersInit, body: cdr });
      if (!uploaded.ok) throw new Error(`Direct R2 CDR upload failed with HTTP ${uploaded.status}`);
      await api(`/api/artworks/${artworkId}/finalize`, { method: "POST" });
      artworkIds[String(slot.slotKey)] = artworkId;
    }

    const configuration = { pricingRuleId, addonIds, ...(delivery ? { delivery } : {}), artworkIds };
    const price = data(await api("/api/pricing/calculate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, quantity, options: { pricingRuleId }, addonIds, delivery }) }));
    if (!price.calculatedAmount || Number(price.calculatedAmount) <= 0) throw new Error("Server pricing did not return an exact positive total");

    async function addPurchase() {
      await api("/api/cart/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "PURCHASE", productId, quantity, configuration }) }, 201);
      const basket = data(await api("/api/cart?kind=PURCHASE"));
      const basketItem = array(basket.items)[0];
      if (!basketItem || Number(object(basket.summary).total) !== Number(price.calculatedAmount)) throw new Error("Purchase basket total did not match server pricing");
      await api(`/api/cart/items/${id(basketItem)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity }) });
    }

    const customer = { contactName: "Customer Flow Test", companyName: "Mahavir Verification", phone: "9426371150" };
    const address = { line1: "Khadia Golwad", line2: "Opp. Jain Digamber Mandir", city: "Ahmedabad", state: "Gujarat", stateCode: "GJ", postalCode: "380001", country: "India" };
    await addPurchase();
    const cod = data(await api("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customer, address, paymentMethod: "COD" }) }, 201));
    if (object(cod.payment).status !== "COD_PENDING") throw new Error("COD checkout did not create the expected payment state");
    const codOrder = object(cod.order);
    if (Math.abs(Number(codOrder.subtotal) + Number(codOrder.tax) - Number(codOrder.total)) > 0.01) throw new Error("Order subtotal, GST, and total do not reconcile");

    await addPurchase();
    const razorpayConfigured = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_WEBHOOK_SECRET);
    if (razorpayConfigured) {
      const razorpay = data(await api("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customer, address, paymentMethod: "RAZORPAY" }) }, 201));
      if (object(razorpay.payment).status !== "PENDING" || object(razorpay.payment).provider !== "RAZORPAY" || !object(razorpay.razorpay).orderId) throw new Error("Razorpay checkout did not create a provider-backed order");
    } else {
      await api("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customer, address, paymentMethod: "RAZORPAY" }) }, 503);
      const pendingBasket = data(await api("/api/cart?kind=PURCHASE"));
      for (const item of array(pendingBasket.items)) await api(`/api/cart/items/${id(item)}`, { method: "DELETE" });
    }

    const [flowUser] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
    if (!flowUser) throw new Error("Temporary customer was not found for credit verification");
    const [flowCustomer] = await db.update(customers).set({ customerType: "B2B", creditEnabled: true, creditLimit: "100000.00", availableCredit: "100000.00", paymentTermsDays: 30 }).where(eq(customers.userId, flowUser.id)).returning({ id: customers.id });
    if (!flowCustomer) throw new Error("Temporary customer credit could not be enabled");
    await addPurchase();
    const credit = data(await api("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customer, address, paymentMethod: "CREDIT" }) }, 201));
    if (object(credit.payment).status !== "CREDIT_APPROVED" || object(credit.payment).provider !== "CUSTOMER_CREDIT" || object(credit.order).status !== "CONFIRMED") throw new Error("B2B credit checkout did not create a confirmed credit order");
    if (Number(credit.availableCredit) >= 100000) throw new Error("B2B credit checkout did not reserve available credit");

    await api("/api/cart/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "QUOTE", productId, quantity, configuration }) }, 201);
    const quote = data(await api("/api/quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contactName: customer.contactName, email, phone: customer.phone, companyName: customer.companyName, notes: "Automated customer flow verification" }) }, 201));
    if (!quote.quoteNumber) throw new Error("Quote submission did not return a quote number");
    const quoteId = id(quote);
    for (const status of ["REVIEWING", "QUOTE_CREATED", "SENT_TO_CUSTOMER"]) await adminApi(`/api/admin/quotes/${quoteId}`, { method: "PATCH", body: JSON.stringify({ status }) });
    const customerQuote = data(await api(`/api/account/quotes/${quoteId}`));
    if (object(customerQuote.quote).status !== "SENT_TO_CUSTOMER") throw new Error("Customer did not receive the admin-sent quotation status");
    await api(`/api/account/quotes/${quoteId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision: "APPROVE", message: "Approved by customer flow verification" }) });
    const convertedOrder = data(await adminApi(`/api/admin/quotes/${quoteId}/convert-to-order`, { method: "POST" }, 201));
    const customerOrder = data(await api(`/api/account/orders/${id(convertedOrder)}`));
    if (object(customerOrder.order).status !== "CONFIRMED" || !array(customerOrder.history).length) throw new Error("Converted order and status history were not synchronized to the customer account");

    const topUp = data(await api("/api/account/wallet/top-up", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: 250 }) }, 201));
    const walletList = data(await adminApi("/api/admin/wallet?status=PENDING"));
    const walletRow = array(walletList.items).find((row) => id(object(row).transaction) === id(topUp));
    if (!walletRow) throw new Error("Customer wallet request did not appear in admin");
    await adminApi(`/api/admin/wallet/${id(topUp)}`, { method: "PATCH", body: JSON.stringify({ decision: "APPROVED", notes: "Automated verification" }) });
    const wallet = data(await api("/api/account/wallet/top-up"));
    if (Number(object(wallet.customer).walletBalance) < 250 || !array(wallet.transactions).some((transaction) => id(transaction) === id(topUp) && transaction.status === "APPROVED")) throw new Error("Admin wallet approval did not synchronize to the customer balance");

    const account = data(await api("/api/account/summary"));
    if (array(account.orders).length < (razorpayConfigured ? 3 : 2) || !array(account.quotes).length || !array(account.artworks).length || !array(account.addresses).length) throw new Error("Customer account history did not contain the completed flow records");

    const customerLogout = await fetch(`${baseUrl}/api/auth/sign-out`, { method: "POST", headers: { Cookie: cookie, Origin: trustedOrigin, "Content-Type": "application/json" }, body: "{}" });
    if (!customerLogout.ok || (await fetch(`${baseUrl}/api/account/summary`, { headers: { Cookie: cookie, Origin: trustedOrigin } })).status !== 401) throw new Error("Customer logout did not invalidate the protected session");
    const adminLogout = await fetch(`${baseUrl}/api/auth/sign-out`, { method: "POST", headers: { Cookie: adminCookie, Origin: trustedOrigin, "Content-Type": "application/json" }, body: "{}" });
    if (!adminLogout.ok || (await fetch(`${baseUrl}/api/admin/session`, { headers: { Cookie: adminCookie, Origin: trustedOrigin } })).status !== 401) throw new Error("Admin logout did not invalidate the protected session");

    console.log(`Customer/admin synchronization passed: catalog, pricing, CDR/R2, COD, ${razorpayConfigured ? "Razorpay provider order" : "safe Razorpay configuration failure"}, B2B credit, quote approval/conversion, status history, wallet approval, account history, and logout invalidation.`);
  } finally {
    for (const artworkId of createdArtworkIds) {
      const [artwork] = await db.select({ storageKey: artworks.storageKey }).from(artworks).where(eq(artworks.id, artworkId)).limit(1);
      if (artwork?.storageKey) await storage.deleteObject(artwork.storageKey).catch(() => undefined);
      await db.delete(artworks).where(eq(artworks.id, artworkId));
    }
    const [testAdmin] = await db.select({ id: user.id }).from(user).where(eq(user.email, adminEmail)).limit(1);
    if (testAdmin) await db.delete(user).where(eq(user.id, testAdmin.id));
    const [testUser] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
    if (testUser) {
      const [customer] = await db.select({ id: customers.id }).from(customers).where(eq(customers.userId, testUser.id)).limit(1);
      await db.transaction(async (tx) => {
        if (customer) {
          await tx.delete(orders).where(eq(orders.customerId, customer.id));
          await tx.delete(quotes).where(or(eq(quotes.userId, testUser.id), eq(quotes.customerId, customer.id)));
          await tx.delete(inquiries).where(eq(inquiries.customerId, customer.id));
          await tx.delete(artworks).where(eq(artworks.customerId, customer.id));
          await tx.delete(customers).where(eq(customers.id, customer.id));
        } else {
          await tx.delete(quotes).where(eq(quotes.userId, testUser.id));
        }
        await tx.delete(user).where(and(eq(user.id, testUser.id), eq(user.email, email)));
      });
    }
    await pool.end();
    console.log("Customer flow verification cleanup finished.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Customer flow verification failed");
  process.exitCode = 1;
});
