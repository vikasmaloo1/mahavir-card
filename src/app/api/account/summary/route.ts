import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";

import { handleApiError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { addresses, artworks, customers, inquiries, orderItems, orders, payments, quotes } from "@/lib/db/schema";
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
    const [rawOrders, customerQuotes, customerInquiries, customerArtwork, customerAddresses] = await Promise.all([
      customerId ? db.select({ id: orders.id, orderNumber: orders.orderNumber, status: orders.status, total: orders.total, notes: orders.notes, createdAt: orders.createdAt, paymentStatus: payments.status }).from(orders).leftJoin(payments, eq(payments.orderId, orders.id)).where(eq(orders.customerId, customerId)).orderBy(desc(orders.createdAt)) : Promise.resolve([]),
      db.select({ id: quotes.id, quoteNumber: quotes.quoteNumber, status: quotes.status, total: quotes.total, createdAt: quotes.createdAt }).from(quotes).where(customerId ? or(eq(quotes.userId, session.user.id), eq(quotes.customerId, customerId)) : eq(quotes.userId, session.user.id)).orderBy(desc(quotes.createdAt)),
      db.select({ id: inquiries.id, subject: inquiries.subject, status: inquiries.status, createdAt: inquiries.createdAt }).from(inquiries).where(customerId ? or(eq(inquiries.customerId, customerId), and(isNull(inquiries.customerId), eq(inquiries.email, session.user.email))) : and(isNull(inquiries.customerId), eq(inquiries.email, session.user.email))).orderBy(desc(inquiries.createdAt)),
      db.select({ id: artworks.id, fileName: artworks.fileName, status: artworks.status, createdAt: artworks.createdAt }).from(artworks).where(customerId ? or(eq(artworks.uploadedBy, session.user.id), eq(artworks.customerId, customerId)) : eq(artworks.uploadedBy, session.user.id)).orderBy(desc(artworks.createdAt)),
      customerId ? db.select({ id: addresses.id, label: addresses.type, line1: addresses.line1, line2: addresses.line2, city: addresses.city, state: addresses.state, stateCode: addresses.stateCode, postalCode: addresses.postalCode, country: addresses.country, isDefault: addresses.isDefault }).from(addresses).where(eq(addresses.customerId, customerId)).orderBy(desc(addresses.isDefault), desc(addresses.createdAt)) : Promise.resolve([]),
    ]);

    let customerOrders = rawOrders as Array<{
      id: string;
      orderNumber: string;
      status: string;
      total: string;
      notes: string | null;
      createdAt: Date | string;
      paymentStatus: string | null;
      items?: Array<{
        id: string;
        description: string;
        jobName: string | null;
        quantity: number;
        totalPrice: string;
        configuration: unknown;
      }>;
    }>;

    if (rawOrders.length > 0) {
      const orderIds = rawOrders.map((o) => o.id);
      const items = await db
        .select({
          id: orderItems.id,
          orderId: orderItems.orderId,
          description: orderItems.description,
          jobName: orderItems.jobName,
          quantity: orderItems.quantity,
          totalPrice: orderItems.totalPrice,
          configuration: orderItems.configuration,
        })
        .from(orderItems)
        .where(inArray(orderItems.orderId, orderIds));

      const itemsByOrder: Record<string, typeof items> = {};
      for (const item of items) {
        if (!itemsByOrder[item.orderId]) itemsByOrder[item.orderId] = [];
        itemsByOrder[item.orderId].push(item);
      }

      customerOrders = rawOrders.map((o) => ({
        ...o,
        items: itemsByOrder[o.id] || [],
      }));
    }

    return jsonOk({ user: { name: session.user.name, email: session.user.email, phoneNumber: session.user.phoneNumber }, customer, profileComplete: isCustomerProfileComplete(customer), orders: customerOrders, quotes: customerQuotes, inquiries: customerInquiries, artworks: customerArtwork, addresses: customerAddresses });
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
