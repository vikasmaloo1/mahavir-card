import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { phoneNumber, emailOTP } from "better-auth/plugins";
import { and, eq, gt } from "drizzle-orm";
import { Pool } from "pg";

import { db } from "./db";
import { emailOtpRequests, user as userTable } from "./db/schema";
import { MailNotConfiguredError, OTP_EXPIRY_MINUTES, sendOtpEmail } from "./mailer";
import { isOtpSendAllowed, OTP_WINDOW_MS } from "./otp-rate-limit";

const database = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/** Endpoints that result in a verification email being sent. */
const OTP_SENDING_PATHS = new Set(["/email-otp/send-verification-otp", "/sign-up/email"]);

function requestedEmail(body: unknown): string | null {
  const email = (body as { email?: unknown } | null)?.email;
  return typeof email === "string" && email.includes("@") ? email.trim().toLowerCase() : null;
}

/**
 * Per-address OTP send limit, backed by the database so it holds across serverless
 * instances. Runs as a before-hook because that is the only place a throw actually
 * aborts the request: the plugin awaits sendVerificationOTP but swallows its errors.
 */
async function enforceOtpSendLimit(email: string) {
  const windowStart = new Date(Date.now() - OTP_WINDOW_MS);
  const prior = await db
    .select({ createdAt: emailOtpRequests.createdAt })
    .from(emailOtpRequests)
    .where(and(eq(emailOtpRequests.email, email), gt(emailOtpRequests.createdAt, windowStart)));
  if (!isOtpSendAllowed(prior.map((row) => row.createdAt))) {
    throw APIError.fromStatus("TOO_MANY_REQUESTS", {
      message: "Too many verification codes requested for this email. Please wait an hour and try again.",
    });
  }
  await db.insert(emailOtpRequests).values({ email });
}

/**
 * Delivery failures recorded by sendVerificationOTP for the current request. The plugin
 * discards the callback's exception, so the after-hook reads this to turn a silent
 * "success" into an honest error the user can act on. Entries are consumed on read.
 */
const pendingSendFailures = new Map<string, { message: string; status: "SERVICE_UNAVAILABLE" | "BAD_GATEWAY" }>();

export const auth = betterAuth({
  appName: "Mahavir Card",
  database,
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  advanced: {
    database: { generateId: "uuid" },
    trustedProxyHeaders: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "CUSTOMER",
        input: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: true,
  },
  emailVerification: {
    // A successful OTP is the proof of ownership — start the session right there instead of
    // making the client replay the password (which fails for accounts created earlier with a
    // different password and left the user on a logged-out redirect).
    autoSignInAfterVerification: true,
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (!OTP_SENDING_PATHS.has(ctx.path)) return;
      const email = requestedEmail(ctx.body);
      if (email) await enforceOtpSendLimit(email);
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (!OTP_SENDING_PATHS.has(ctx.path)) return;
      const email = requestedEmail(ctx.body);
      const failure = email ? pendingSendFailures.get(email) : undefined;
      if (!email || !failure) return;
      pendingSendFailures.delete(email);
      throw APIError.fromStatus(failure.status, { message: failure.message });
    }),
  },
  databaseHooks: {
    session: {
      create: {
        // Phone sign-in doesn't know about requireEmailVerification. Refuse to mint a session
        // for an unverified account through any route so the gate can't be side-stepped.
        before: async (session) => {
          const [record] = await db
            .select({ emailVerified: userTable.emailVerified })
            .from(userTable)
            .where(eq(userTable.id, session.userId))
            .limit(1);
          if (record && !record.emailVerified) {
            throw APIError.fromStatus("FORBIDDEN", { code: "EMAIL_NOT_VERIFIED", message: "Email not verified" });
          }
          return { data: session };
        },
      },
    },
  },
  plugins: [
    phoneNumber({
      requireVerification: false,
      sendOTP: async () => {
        throw new Error("SMS provider is not configured");
      },
    }),
    emailOTP({
      otpLength: 6,
      expiresIn: OTP_EXPIRY_MINUTES * 60,
      allowedAttempts: 3, // 3 wrong tries invalidates the code
      sendVerificationOnSignUp: true, // the sign-up after-hook sends the first code
      disableSignUp: true, // no OTP-only account creation
      storeOTP: "encrypted",
      resendStrategy: "reuse", // resend re-issues the live code with a fresh expiry
      async sendVerificationOTP({ email, otp, type }) {
        try {
          // Awaited on purpose: a fire-and-forget send is dropped when the serverless
          // function is frozen after the response, and the user simply never gets a code.
          await sendOtpEmail(email, otp, type);
        } catch (error) {
          console.error("OTP email delivery failed", { email, type, error });
          pendingSendFailures.set(email, error instanceof MailNotConfiguredError
            ? { status: "SERVICE_UNAVAILABLE", message: error.message }
            : { status: "BAD_GATEWAY", message: "We couldn't send the verification email right now. Please try again in a moment." });
        }
      },
    }),
  ],
});
