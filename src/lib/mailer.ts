import nodemailer, { type Transporter } from "nodemailer";

export type OtpEmailType = "email-verification" | "sign-in" | "forget-password" | "change-email";

export const OTP_EXPIRY_MINUTES = 15;

const copyByType: Record<OtpEmailType, { subject: (otp: string) => string; heading: string; intro: string }> = {
  "email-verification": {
    subject: (otp) => `${otp} is your Mahavir Card verification code`,
    heading: "Verify your email",
    intro: "Enter this code to finish creating your Mahavir Card account.",
  },
  "sign-in": {
    subject: (otp) => `${otp} is your Mahavir Card sign-in code`,
    heading: "Your sign-in code",
    intro: "Enter this code to sign in to Mahavir Card.",
  },
  "forget-password": {
    subject: (otp) => `${otp} is your Mahavir Card password reset code`,
    heading: "Reset your password",
    intro: "Enter this code to set a new password for your Mahavir Card account.",
  },
  "change-email": {
    subject: (otp) => `${otp} is your Mahavir Card email change code`,
    heading: "Confirm your new email",
    intro: "Enter this code to confirm the new email address on your Mahavir Card account.",
  },
};

export class MailNotConfiguredError extends Error {
  constructor() {
    super("Email delivery is not configured (SMTP_USER / SMTP_PASS missing)");
    this.name = "MailNotConfiguredError";
  }
}

let transporter: Transporter | null = null;

/**
 * Pooled transport, created once per process. Pooling keeps the SMTP connection
 * open between sends so a resend doesn't pay the TLS + auth handshake again.
 */
function getTransporter() {
  if (transporter) return transporter;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) throw new MailNotConfiguredError();
  const port = Number(process.env.SMTP_PORT) || 587;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user, pass },
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return transporter;
}

export function otpEmailContent(otp: string, type: OtpEmailType = "email-verification") {
  const copy = copyByType[type];
  const safeOtp = otp.replace(/\D/g, "");
  const text = [
    "Mahavir Card",
    "",
    copy.heading,
    copy.intro,
    "",
    `Your code: ${safeOtp}`,
    "",
    `This code expires in ${OTP_EXPIRY_MINUTES} minutes. If you didn't request it, you can ignore this email.`,
  ].join("\n");
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 420px; margin: 0 auto; padding: 32px 24px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #1e3a5f; margin: 0; font-size: 22px;">Mahavir Card</h2>
        <p style="color: #8b9bb5; font-size: 13px; margin: 4px 0 0;">Offset Printing · Ahmedabad</p>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px; text-align: center;">
        <p style="color: #0f172a; font-size: 16px; font-weight: 700; margin: 0 0 6px;">${copy.heading}</p>
        <p style="color: #334155; font-size: 14px; margin: 0 0 16px;">${copy.intro}</p>
        <p style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1e3a5f; margin: 0; font-family: 'Courier New', monospace;">${safeOtp}</p>
      </div>
      <p style="color: #94a3b8; font-size: 13px; text-align: center; margin-top: 20px; line-height: 1.5;">
        This code expires in ${OTP_EXPIRY_MINUTES} minutes.<br/>
        If you didn't request this, ignore this email.
      </p>
    </div>
  `;
  return { subject: copy.subject(safeOtp), text, html };
}

export async function sendOtpEmail(to: string, otp: string, type: OtpEmailType = "email-verification") {
  const content = otpEmailContent(otp, type);
  await getTransporter().sendMail({
    from: process.env.SMTP_FROM || `Mahavir Card <${process.env.SMTP_USER}>`,
    to,
    ...content,
  });
}
