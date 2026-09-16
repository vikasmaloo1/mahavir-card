import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { auth } from "@/lib/auth/server";
import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { addresses, bills, customers, orders, user as authUser, walletTransactions } from "@/lib/db/schema";
import { isValidIndianPhoneNumber, normalizePhoneNumber } from "@/lib/phone";
import { requireRole } from "@/lib/permissions";

export async function POST(request: Request) {
  try {
    const session = await requireRole(request, ["ADMIN"]);
    const body = ((await request.json().catch(() => ({}))) || {}) as Record<string, unknown>;

    const contactName = String(body.contactName ?? "").trim();
    const companyName = String(body.companyName ?? "").trim();
    if (!contactName) return jsonError("Contact name is required", 400);
    if (!companyName) return jsonError("Company name is required", 400);

    const customerType = body.customerType === "B2B" ? "B2B" : "B2C";
    const rawEmail = typeof body.email === "string" ? body.email.trim() : "";
    const rawPhone = typeof body.phone === "string" ? body.phone.trim() : "";

    let normalizedPhone: string | null = null;
    if (rawPhone) {
      if (!isValidIndianPhoneNumber(rawPhone)) {
        return jsonError("Please enter a valid 10-digit Indian mobile number", 400);
      }
      normalizedPhone = normalizePhoneNumber(rawPhone);
    }

    const createLogin = Boolean(body.createLogin);
    let userId: string | null = null;

    if (createLogin) {
      if (!rawEmail) return jsonError("Email is required when creating a login account", 400);
      const password = typeof body.password === "string" ? body.password : "";
      if (!password || password.length < 8) {
        return jsonError("Password must be at least 8 characters", 400);
      }

      const [existingUser] = await db
        .select({ id: authUser.id })
        .from(authUser)
        .where(eq(authUser.email, rawEmail.toLowerCase()))
        .limit(1);

      if (existingUser) {
        return jsonError("A user account with this email already exists", 409);
      }

      const signupRes = await auth.api.signUpEmail({
        body: {
          name: contactName,
          email: rawEmail.toLowerCase(),
          password,
        },
      });

      if (!signupRes?.user?.id) {
        return jsonError("Failed to provision customer user account", 500);
      }

      userId = signupRes.user.id;
      await db
        .update(authUser)
        .set({
          role: "CUSTOMER",
          ...(normalizedPhone ? { phoneNumber: normalizedPhone, phoneNumberVerified: false } : {}),
        })
        .where(eq(authUser.id, userId));
    }

    const effectiveEmail = rawEmail || `offline-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 4)}@offline.local`;
    const stateCode = typeof body.stateCode === "string" && body.stateCode ? body.stateCode.toUpperCase() : "GJ";
    const state = typeof body.state === "string" && body.state ? body.state : (stateCode === "RJ" ? "Rajasthan" : "Gujarat");
    const city = typeof body.city === "string" ? body.city.trim() || null : null;
    const gstNumber = typeof body.gstNumber === "string" ? body.gstNumber.trim().toUpperCase() || null : null;

    const creditEnabled =
      body.creditEnabled !== undefined && body.creditEnabled !== null && body.creditEnabled !== ""
        ? (body.creditEnabled === true || body.creditEnabled === "true")
        : customerType === "B2B";
    const creditLimit = Number(body.creditLimit || 0).toFixed(2);
    const availableCredit = Number(body.availableCredit || 0).toFixed(2);
    const paymentTermsDays = Math.max(0, Number(body.paymentTermsDays || 0));
    const status = body.status === "INACTIVE" ? "INACTIVE" : "ACTIVE";

    const result = await db.transaction(async (tx) => {
      const [newCustomer] = await tx
        .insert(customers)
        .values({
          userId,
          contactName,
          companyName,
          email: effectiveEmail,
          phone: normalizedPhone || rawPhone || null,
          gstNumber,
          customerType,
          city,
          state,
          stateCode,
          creditEnabled,
          creditLimit,
          availableCredit,
          walletBalance: availableCredit,
          paymentTermsDays,
          status,
        })
        .returning();

      if (Number(availableCredit) !== 0) {
        await tx.insert(walletTransactions).values({
          customerId: newCustomer.id,
          transactionType: Number(availableCredit) > 0 ? "ADMIN_CREDIT" : "ADMIN_DEBIT",
          status: "APPROVED",
          amount: Math.abs(Number(availableCredit)).toFixed(2),
          balanceBefore: "0.00",
          balanceAfter: availableCredit,
          reference: "OPENING_BALANCE",
          notes: "Initial balance recorded on customer creation",
          createdBy: session.user.id,
        });
      }

      return newCustomer;
    });

    return jsonOk(result, 201);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const params = new URL(request.url).searchParams;
    const page = Math.max(1, Number(params.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(params.get("limit") ?? 25)));
    const query = (params.get("query") || params.get("q"))?.trim();
    const customerType = params.get("customerType")?.trim();
    const status = params.get("status")?.trim();
    const state = params.get("state")?.trim();
    const balance = params.get("balance")?.trim();
    const sort = params.get("sort")?.trim();

    const conditions = [];

    if (query) {
      conditions.push(
        or(
          ilike(customers.companyName, `%${query}%`),
          ilike(customers.contactName, `%${query}%`),
          ilike(customers.email, `%${query}%`),
          ilike(customers.phone, `%${query}%`),
          ilike(customers.gstNumber, `%${query}%`),
        ),
      );
    }

    if (customerType === "B2B" || customerType === "B2C") {
      conditions.push(eq(customers.customerType, customerType));
    }

    if (status === "ACTIVE" || status === "INACTIVE") {
      conditions.push(eq(customers.status, status));
    }

    if (state) {
      conditions.push(
        or(
          eq(customers.state, state),
          eq(customers.stateCode, state.toUpperCase()),
        ),
      );
    }

    if (balance === "NEGATIVE") {
      conditions.push(sql`CAST(${customers.availableCredit} AS NUMERIC) < 0`);
    } else if (balance === "ZERO") {
      conditions.push(sql`CAST(${customers.availableCredit} AS NUMERIC) = 0`);
    } else if (balance === "POSITIVE") {
      conditions.push(sql`CAST(${customers.availableCredit} AS NUMERIC) > 0`);
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    let orderBy;
    switch (sort) {
      case "BALANCE_DESC":
        orderBy = desc(sql`CAST(${customers.availableCredit} AS NUMERIC)`);
        break;
      case "BALANCE_ASC":
        orderBy = asc(sql`CAST(${customers.availableCredit} AS NUMERIC)`);
        break;
      case "NAME_ASC":
        orderBy = asc(customers.contactName);
        break;
      case "NAME_DESC":
        orderBy = desc(customers.contactName);
        break;
      case "OLDEST":
        orderBy = asc(customers.createdAt);
        break;
      case "NEWEST":
      default:
        orderBy = desc(customers.createdAt);
        break;
    }

    const [totalResult, data] = await Promise.all([
      db.select({ value: count() }).from(customers).where(whereClause),
      db
        .select()
        .from(customers)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(limit)
        .offset((page - 1) * limit),
    ]);

    const total = Number(totalResult[0]?.value ?? 0);

    // Attach address for each customer from addresses table, or fallback to past bills / orders
    const customerIds = data.map((c) => c.id);
    let addressRows: any[] = [];
    const billAddressMap = new Map<string, any>();
    const orderAddressMap = new Map<string, any>();

    if (customerIds.length > 0) {
      // 1. Query addresses table
      addressRows = await db
        .select()
        .from(addresses)
        .where(inArray(addresses.customerId, customerIds));

      // 2. For customers without address in addresses table, check bills table
      const custsWithoutAddress = customerIds.filter(
        (id) => !addressRows.some((a) => a.customerId === id && (a.line1 || a.line2))
      );

      if (custsWithoutAddress.length > 0) {
        const billRows = await db
          .select({
            customerId: bills.customerId,
            addressLine1: bills.addressLine1,
            addressLine2: bills.addressLine2,
            city: bills.city,
            state: bills.state,
            stateCode: bills.stateCode,
            postalCode: bills.postalCode,
          })
          .from(bills)
          .where(
            and(
              inArray(bills.customerId, custsWithoutAddress),
              sql`${bills.addressLine1} IS NOT NULL AND ${bills.addressLine1} != ''`
            )
          )
          .orderBy(desc(bills.createdAt));

        for (const b of billRows) {
          if (b.customerId && !billAddressMap.has(b.customerId) && b.addressLine1) {
            billAddressMap.set(b.customerId, {
              line1: b.addressLine1,
              line2: b.addressLine2,
              city: b.city,
              state: b.state,
              stateCode: b.stateCode,
              postalCode: b.postalCode,
            });
          }
        }
      }

      // 3. For customers still without address, check orders table
      const stillWithoutAddress = custsWithoutAddress.filter((id) => !billAddressMap.has(id));
      if (stillWithoutAddress.length > 0) {
        const orderRows = await db
          .select({
            customerId: orders.customerId,
            deliveryAddress: orders.deliveryAddress,
            deliveryState: orders.deliveryState,
          })
          .from(orders)
          .where(
            and(
              inArray(orders.customerId, stillWithoutAddress),
              sql`${orders.deliveryAddress} IS NOT NULL`
            )
          )
          .orderBy(desc(orders.createdAt));

        for (const o of orderRows) {
          if (o.customerId && !orderAddressMap.has(o.customerId) && o.deliveryAddress?.line1) {
            orderAddressMap.set(o.customerId, {
              line1: o.deliveryAddress.line1,
              line2: o.deliveryAddress.line2,
              city: o.deliveryAddress.city,
              state: o.deliveryAddress.state,
              stateCode: o.deliveryAddress.stateCode || o.deliveryState,
              postalCode: o.deliveryAddress.postalCode,
            });
          }
        }
      }
    }

    const items = data.map((cust) => {
      const custAddrs = addressRows.filter((a) => a.customerId === cust.id);
      const primaryAddr =
        custAddrs.find((a) => a.isDefault) ||
        custAddrs.find((a) => a.type === "BILLING") ||
        custAddrs[0];
      const fallbackBill = billAddressMap.get(cust.id);
      const fallbackOrder = orderAddressMap.get(cust.id);

      const finalLine1 = primaryAddr?.line1 || fallbackBill?.line1 || fallbackOrder?.line1 || null;
      const finalLine2 = primaryAddr?.line2 || fallbackBill?.line2 || fallbackOrder?.line2 || null;
      const finalCity = primaryAddr?.city || fallbackBill?.city || fallbackOrder?.city || cust.city || "Ahmedabad";
      const finalState = primaryAddr?.state || fallbackBill?.state || fallbackOrder?.state || cust.state || "Gujarat";
      const finalStateCode = primaryAddr?.stateCode || fallbackBill?.stateCode || fallbackOrder?.stateCode || cust.stateCode || "GJ";
      const finalPostalCode = primaryAddr?.postalCode || fallbackBill?.postalCode || fallbackOrder?.postalCode || null;

      return {
        ...cust,
        addressLine1: finalLine1,
        addressLine2: finalLine2,
        city: finalCity,
        state: finalState,
        stateCode: finalStateCode,
        postalCode: finalPostalCode,
        addresses: custAddrs,
      };
    });

    return jsonOk({
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
