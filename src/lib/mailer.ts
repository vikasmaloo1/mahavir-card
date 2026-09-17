import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOtpEmail(to: string, otp: string) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: `${otp} — Your Mahavir Card verification code`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 420px; margin: 0 auto; padding: 32px 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #1e3a5f; margin: 0; font-size: 22px;">Mahavir Card</h2>
          <p style="color: #8b9bb5; font-size: 13px; margin: 4px 0 0;">Offset Printing · Ahmedabad</p>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px; text-align: center;">
          <p style="color: #334155; font-size: 15px; margin: 0 0 16px;">Your verification code:</p>
          <p style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1e3a5f; margin: 0; font-family: 'Courier New', monospace;">${otp}</p>
        </div>
        <p style="color: #94a3b8; font-size: 13px; text-align: center; margin-top: 20px; line-height: 1.5;">
          This code expires in 15 minutes.<br/>
          If you didn't request this, ignore this email.
        </p>
      </div>
    `,
  });
}
