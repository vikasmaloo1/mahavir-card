import { betterAuth } from "better-auth";
import { phoneNumber, emailOTP } from "better-auth/plugins";
import { Pool } from "pg";

import { sendOtpEmail } from "./mailer";

const database = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/* ── Rate-limit: max 5 OTP sends per email per hour (in-memory) ── */
const otpSendLog = new Map<string, { count: number; resetAt: number }>();

function checkOtpRateLimit(email: string) {
  const now = Date.now();
  const entry = otpSendLog.get(email);
  if (entry && entry.resetAt > now && entry.count >= 5) {
    throw new Error("Too many verification requests. Please try again later.");
  }
  if (!entry || entry.resetAt <= now) {
    otpSendLog.set(email, { count: 1, resetAt: now + 3_600_000 });
  } else {
    entry.count++;
  }
}

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
  plugins: [
    phoneNumber({
      requireVerification: false,
      sendOTP: async () => {
        throw new Error("SMS provider is not configured");
      },
    }),
    emailOTP({
      otpLength: 6,
      expiresIn: 900, // 15 minutes
      allowedAttempts: 3, // 3 wrong tries → OTP invalidated
      sendVerificationOnSignUp: true, // auto-send OTP when account is created
      disableSignUp: true, // don't allow OTP-only account creation
      storeOTP: "encrypted",
      resendStrategy: "reuse", // resend same OTP with extended expiry
      async sendVerificationOTP({ email, otp, type }) {
        if (type === "email-verification") {
          checkOtpRateLimit(email);
          void sendOtpEmail(email, otp);
        }
      },
    }),
  ],
});
