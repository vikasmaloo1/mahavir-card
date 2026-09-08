import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";

import { handleApiError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { customers } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const params = new URL(request.url).searchParams;
    const page = Math.max(1, Number(params.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(params.get("limit") ?? 25)));
    const query = params.get("q")?.trim();
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

    return jsonOk({
      items: data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
