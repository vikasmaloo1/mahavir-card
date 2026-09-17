import "server-only";

import { and, eq, isNull, lt, notExists } from "drizzle-orm";

import { db } from "@/lib/db/server";
import { customers, emailOtpRequests, user } from "@/lib/db/schema";
import { OTP_WINDOW_MS } from "@/lib/otp-rate-limit";

const UNVERIFIED_ACCOUNT_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Removes sign-ups that never verified their email within a day, so an address
 * someone typed by mistake (or squatted) frees up again, and drops OTP rate-limit
 * rows that have aged out of their window. Both are safe to re-run.
 */
export async function runAuthMaintenance() {
  const staleBefore = new Date(Date.now() - UNVERIFIED_ACCOUNT_TTL_MS);
  const purgedUsers = await db
    .delete(user)
    .where(
      and(
        eq(user.emailVerified, false),
        lt(user.createdAt, staleBefore),
        // Never touch an account that already has a customer record (legacy / admin-provisioned).
        notExists(db.select({ id: customers.id }).from(customers).where(eq(customers.userId, user.id))),
        isNull(user.phoneNumber),
      ),
    )
    .returning({ id: user.id });

  const purgedOtpRows = await db
    .delete(emailOtpRequests)
    .where(lt(emailOtpRequests.createdAt, new Date(Date.now() - OTP_WINDOW_MS)))
    .returning({ id: emailOtpRequests.id });

  return { purgedUnverifiedUsers: purgedUsers.length, purgedOtpRequestRows: purgedOtpRows.length };
}
