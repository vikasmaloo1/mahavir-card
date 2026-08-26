import dotenv from "dotenv";
import { and, eq } from "drizzle-orm";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
const { auth } = await import("../src/lib/auth");
const { db, pool } = await import("../src/lib/db");
const { admins, user } = await import("../src/lib/db/schema");
const { isValidIndianPhoneNumber, normalizePhoneNumber } = await import("../src/lib/phone");

const name = process.env.INITIAL_ADMIN_NAME;
const email = process.env.INITIAL_ADMIN_EMAIL;
const password = process.env.INITIAL_ADMIN_PASSWORD;
const phoneNumber = process.env.INITIAL_ADMIN_PHONE;

if (!name || !email || !password) {
  throw new Error("Set INITIAL_ADMIN_NAME, INITIAL_ADMIN_EMAIL, and INITIAL_ADMIN_PASSWORD before bootstrapping.");
}
if (phoneNumber && !isValidIndianPhoneNumber(phoneNumber)) throw new Error("INITIAL_ADMIN_PHONE must be a valid Indian mobile number.");

const existing = await db.select({ id: admins.id }).from(admins).where(and(eq(admins.status, "ACTIVE"))).limit(1);
if (existing.length > 0) {
  throw new Error("An active admin already exists. Use the protected admin management API instead.");
}

const result = await auth.api.signUpEmail({ body: { name, email, password } });
await db.update(user).set({ role: "ADMIN", ...(phoneNumber ? { phoneNumber: normalizePhoneNumber(phoneNumber), phoneNumberVerified: false } : {}) }).where(eq(user.id, result.user.id));
await db.insert(admins).values({ userId: result.user.id, role: "ADMIN" });
console.log(`Bootstrapped ADMIN for ${email}`);
await pool.end();
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
