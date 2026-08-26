import { and, desc, eq, isNull, or } from "drizzle-orm";

import { handleApiError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { addresses, artworks, customers, inquiries, orders, quotes } from "@/lib/db/schema";
import { requireUser } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    const session = await requireUser(request);
    const [customer] = await db.select().from(customers).where(eq(customers.userId, session.user.id)).limit(1);
    const customerId = customer?.id;
    const [customerOrders, customerQuotes, customerInquiries, customerArtwork, customerAddresses] = await Promise.all([
      customerId ? db.select().from(orders).where(eq(orders.customerId, customerId)).orderBy(desc(orders.createdAt)) : Promise.resolve([]),
      db.select().from(quotes).where(customerId ? or(eq(quotes.userId, session.user.id), eq(quotes.customerId, customerId)) : eq(quotes.userId, session.user.id)).orderBy(desc(quotes.createdAt)),
      db.select().from(inquiries).where(customerId ? or(eq(inquiries.customerId, customerId), and(isNull(inquiries.customerId), eq(inquiries.email, session.user.email))) : and(isNull(inquiries.customerId), eq(inquiries.email, session.user.email))).orderBy(desc(inquiries.createdAt)),
      db.select().from(artworks).where(customerId ? or(eq(artworks.uploadedBy, session.user.id), eq(artworks.customerId, customerId)) : eq(artworks.uploadedBy, session.user.id)).orderBy(desc(artworks.createdAt)),
      customerId ? db.select().from(addresses).where(eq(addresses.customerId, customerId)).orderBy(desc(addresses.createdAt)) : Promise.resolve([]),
    ]);
    return jsonOk({ user: { name: session.user.name, email: session.user.email, phoneNumber: session.user.phoneNumber }, customer, orders: customerOrders, quotes: customerQuotes, inquiries: customerInquiries, artworks: customerArtwork, addresses: customerAddresses });
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
