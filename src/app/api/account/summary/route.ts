import { and, desc, eq, isNull, or } from "drizzle-orm";

import { handleApiError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { addresses, artworks, customers, inquiries, orders, quotes } from "@/lib/db/schema";
import { isCustomerProfileComplete } from "@/lib/customer-profile";
import { requireUser } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    const session = await requireUser(request);
    const [customer] = await db.select({
      id: customers.id,
      companyName: customers.companyName,
      contactName: customers.contactName,
      phone: customers.phone,
      city: customers.city,
      state: customers.state,
      stateCode: customers.stateCode,
      gstNumber: customers.gstNumber,
      customerType: customers.customerType,
      creditEnabled: customers.creditEnabled,
      creditLimit: customers.creditLimit,
      availableCredit: customers.availableCredit,
      paymentTermsDays: customers.paymentTermsDays,
      status: customers.status,
    }).from(customers).where(eq(customers.userId, session.user.id)).limit(1);
    const customerId = customer?.id;
    const [customerOrders, customerQuotes, customerInquiries, customerArtwork, customerAddresses] = await Promise.all([
      customerId ? db.select({ id: orders.id, orderNumber: orders.orderNumber, status: orders.status, total: orders.total, createdAt: orders.createdAt }).from(orders).where(eq(orders.customerId, customerId)).orderBy(desc(orders.createdAt)) : Promise.resolve([]),
      db.select({ id: quotes.id, quoteNumber: quotes.quoteNumber, status: quotes.status, total: quotes.total, createdAt: quotes.createdAt }).from(quotes).where(customerId ? or(eq(quotes.userId, session.user.id), eq(quotes.customerId, customerId)) : eq(quotes.userId, session.user.id)).orderBy(desc(quotes.createdAt)),
      db.select({ id: inquiries.id, subject: inquiries.subject, status: inquiries.status, createdAt: inquiries.createdAt }).from(inquiries).where(customerId ? or(eq(inquiries.customerId, customerId), and(isNull(inquiries.customerId), eq(inquiries.email, session.user.email))) : and(isNull(inquiries.customerId), eq(inquiries.email, session.user.email))).orderBy(desc(inquiries.createdAt)),
      db.select({ id: artworks.id, fileName: artworks.fileName, status: artworks.status, createdAt: artworks.createdAt }).from(artworks).where(customerId ? or(eq(artworks.uploadedBy, session.user.id), eq(artworks.customerId, customerId)) : eq(artworks.uploadedBy, session.user.id)).orderBy(desc(artworks.createdAt)),
      customerId ? db.select({ id: addresses.id, label: addresses.type, line1: addresses.line1, line2: addresses.line2, city: addresses.city, state: addresses.state, stateCode: addresses.stateCode, postalCode: addresses.postalCode, country: addresses.country }).from(addresses).where(eq(addresses.customerId, customerId)).orderBy(desc(addresses.createdAt)) : Promise.resolve([]),
    ]);
    return jsonOk({ user: { name: session.user.name, email: session.user.email, phoneNumber: session.user.phoneNumber }, customer, profileComplete: isCustomerProfileComplete(customer), orders: customerOrders, quotes: customerQuotes, inquiries: customerInquiries, artworks: customerArtwork, addresses: customerAddresses });
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
