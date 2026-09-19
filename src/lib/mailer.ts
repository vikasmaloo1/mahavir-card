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
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${copy.subject(safeOtp)}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 40px 16px;">
        <tr>
          <td align="center">
            <!-- Email Card Container -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 540px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(9, 25, 46, 0.08); border: 1px solid #e2e8f0;">
              
              <!-- Brand Header Bar -->
              <tr>
                <td style="background-color: #09192E; border-top: 4px solid #C59B27; padding: 30px 36px; text-align: center;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td align="center">
                        <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 1.5px; margin: 0; text-transform: uppercase;">
                          MAHAVIR CARD
                        </h1>
                        <p style="color: #C59B27; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin: 6px 0 0;">
                          Commercial Offset Press &bull; Khadia, Ahmedabad
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Email Body Content -->
              <tr>
                <td style="padding: 36px 36px 28px;">
                  
                  <!-- Security Badge -->
                  <div style="display: inline-block; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 100px; padding: 4px 14px; margin-bottom: 16px;">
                    <span style="color: #1e40af; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">
                      &#128274; Security Verification
                    </span>
                  </div>

                  <h2 style="color: #0f172a; font-size: 20px; font-weight: 800; margin: 0 0 8px; line-height: 1.3;">
                    ${copy.heading}
                  </h2>
                  <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
                    ${copy.intro} Please use the one-time verification code below to proceed:
                  </p>

                  <!-- OTP Digits Box -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 14px; margin-bottom: 24px;">
                    <tr>
                      <td align="center" style="padding: 24px 16px;">
                        <span style="display: block; font-size: 11px; font-weight: 800; letter-spacing: 2px; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">
                          YOUR VERIFICATION CODE
                        </span>
                        <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #09192E; line-height: 1;">
                          ${safeOtp}
                        </div>
                        <span style="display: block; font-size: 12px; color: #dc2626; font-weight: 600; margin-top: 10px;">
                          &#9203; Expires in ${OTP_EXPIRY_MINUTES} minutes
                        </span>
                      </td>
                    </tr>
                  </table>

                  <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0 0 24px;">
                    For security reasons, never share this code with anyone. Mahavir Card representatives will never ask you for your verification code.
                  </p>

                  <!-- Help & Storefront Link -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
                    <tr>
                      <td>
                        <p style="color: #64748b; font-size: 12px; margin: 0; line-height: 1.5;">
                          Didn&apos;t request this code? You can safely ignore this email. Someone may have mistyped their email address.
                        </p>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>

              <!-- Business Info & Trust Strip -->
              <tr>
                <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 36px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td style="font-size: 12px; color: #475569; line-height: 1.6;">
                        <strong>Mahavir Card Commercial Printing</strong><br/>
                        Khadia Golwad, Opp. Jain Digamber Mandir, Ahmedabad &ndash; 380001<br/>
                        Phone / WhatsApp: <a href="tel:+919426371150" style="color: #1e3a5f; text-decoration: none; font-weight: 600;">+91 94263 71150</a> &bull; Website: <a href="https://mahavircard.in" style="color: #1e3a5f; text-decoration: none; font-weight: 600;">mahavircard.in</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer Disclaimer -->
              <tr>
                <td style="background-color: #09192E; padding: 16px 36px; text-align: center;">
                  <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                    &copy; 2026 Mahavir Card. All rights reserved. &bull; 25+ Years of Press Mastery
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
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
