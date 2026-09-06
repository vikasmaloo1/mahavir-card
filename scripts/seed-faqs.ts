import dotenv from "dotenv";
import { count } from "drizzle-orm";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

import { faqs } from "../src/lib/db/schema";

dotenv.config({ path: ".env.local" });
dotenv.config();

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.POSTGRES_URL_NON_POOLING ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("No database connection string configured");

const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const db = drizzle(pool);

/** Content reflects actual verified system behavior — not generic filler. */
const defaultFaqs = [
  { category: "Ordering", question: "Do I need an account to see prices?", answer: "Yes — sign in to see live pricing. Anonymous visitors see \"Login to view price\" on the catalogue; every product page calculates the exact price for your quantity and configuration once you're signed in.", sortOrder: 0 },
  { category: "Ordering", question: "Can I place a direct order without a quote?", answer: "Most products (like Visiting Cards) are direct-order only — configure, pay, and we start production. A few products are quote-only for custom specifications; those show \"Request a quote\" instead of \"Buy now\".", sortOrder: 1 },
  { category: "Pricing/GST", question: "Is GST included in the price shown?", answer: "For B2C (retail) customers, CGST/SGST (or IGST for interstate) is calculated and shown separately at checkout, on top of the base price. For B2B (wholesale) accounts on eligible pricing rules, GST is not applied. The exact rate depends on which pricing rule matches your account type.", sortOrder: 0 },
  { category: "Pricing/GST", question: "Why is my B2B price different from the price I saw as a guest?", answer: "Pricing rules are matched to your account's customer type (B2B or B2C). The calculator always uses the rule that matches your actual account, so a B2B account and a B2C account can see different base prices and different GST treatment for the same product.", sortOrder: 1 },
  { category: "Artwork", question: "What file formats do you accept for artwork?", answer: "CorelDRAW (.cdr) files only for print-ready artwork, per product-specific requirements (dimensions, safe area, and any front/back or Spot UV slots). See the Artwork Guide for the exact specification of the product you're ordering.", sortOrder: 0 },
  { category: "Artwork", question: "Can I reuse artwork from a previous order?", answer: "Yes — if you've previously uploaded a CDR file for the same product and the same configuration, you'll see a \"Use previous artwork\" option instead of having to upload again. It only appears when the product and configuration genuinely match.", sortOrder: 1 },
  { category: "Artwork", question: "What happens if my artwork is rejected?", answer: "Our team reviews every upload before production. If changes are needed, your order/artwork status will show \"Changes required\" or \"Rejected\" with review notes, and you'll need to re-upload a corrected file before production continues.", sortOrder: 2 },
  { category: "Payment", question: "What payment methods are available?", answer: "Cash on delivery (COD), UPI QR (scan and pay, then submit your UPI reference for confirmation), Razorpay (cards/UPI/netbanking) where enabled, and business credit/wallet balance for approved B2B accounts.", sortOrder: 0 },
  { category: "Payment", question: "My payment succeeded but the order still shows pending — what do I do?", answer: "UPI QR payments require you to submit the transaction reference (UTR) after paying — we confirm it manually against our bank statement. Razorpay payments are verified automatically; if a Razorpay payment doesn't confirm within a few minutes, contact us with your order number.", sortOrder: 1 },
  { category: "Delivery", question: "Which states do you deliver to?", answer: "Courier delivery is currently available for Gujarat and Rajasthan. Local pickup is available from our Ahmedabad location for any customer. If you need delivery elsewhere, use \"Request a Quote\" — we may still be able to arrange special dispatch.", sortOrder: 0 },
  { category: "State availability", question: "A product shows \"not available in your state\" — what can I do?", answer: "Use the \"Not available in your state?\" prompt on the product page to send us your requirement with your state pre-filled. Our production desk will check if special courier dispatch can be arranged.", sortOrder: 0 },
  { category: "Quotes", question: "How does the quote process work?", answer: "Add items to your quote basket and submit — we review and send you formal pricing. Once you approve a sent quote, an order is created automatically at the quoted price (it's never recalculated), and you're prompted for payment if needed.", sortOrder: 0 },
  { category: "Quotes", question: "What if my quote expires before I approve it?", answer: "Quotes carry a validity period. Once it passes, you can no longer approve that quote — request a fresh one for the same or updated specifications from your account.", sortOrder: 1 },
  { category: "Reorder", question: "Can I reorder something I've ordered before?", answer: "Yes — use \"Reorder\" on any past order, or save a job with a custom name (\"Order Again\") for one-click repeat ordering. Either way, the price is always recalculated live using current rates — never the old stored amount.", sortOrder: 0 },
  { category: "B2B", question: "How do I get B2B pricing and business credit?", answer: "Complete your customer profile as a business account. B2B accounts get access to wholesale pricing rules, GST treatment specific to B2B, and — where approved — a credit/wallet balance for ordering against existing terms.", sortOrder: 0 },
  { category: "Custom requirements", question: "I need something we don't sell online (bill books, custom stationery, etc.) — can you help?", answer: "Yes — use \"Share Your Requirement\" from search, a product page, or the Request a Quote page. Tell us the specification and quantity and our team will follow up with a custom quotation.", sortOrder: 0 },
];

async function main() {
  const [existing] = await db.select({ total: count() }).from(faqs);
  if (existing.total > 0) {
    console.log(`faqs table already has ${existing.total} rows — skipping seed to avoid duplicates.`);
    await pool.end();
    return;
  }
  await db.insert(faqs).values(defaultFaqs);
  console.log(`Seeded ${defaultFaqs.length} FAQ entries.`);
  await pool.end();
}

main().catch((error) => { console.error(error); process.exit(1); });
