import assert from "node:assert/strict";
import test from "node:test";

import { otpEmailContent } from "../src/lib/mailer";
import { isOtpSendAllowed, OTP_SENDS_PER_WINDOW, OTP_WINDOW_MS } from "../src/lib/otp-rate-limit";
import { isValidIndianPhoneNumber, normalizePhoneNumber } from "../src/lib/phone";

const now = new Date("2026-09-18T10:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);

test("OTP send limit allows up to the cap inside the trailing hour", () => {
  const sends = Array.from({ length: OTP_SENDS_PER_WINDOW - 1 }, (_, i) => ago(i * 60_000));
  assert.equal(isOtpSendAllowed(sends, now), true);
  assert.equal(isOtpSendAllowed([...sends, ago(30_000)], now), false);
});

test("OTP send limit ignores sends that have aged out of the window", () => {
  const stale = Array.from({ length: OTP_SENDS_PER_WINDOW }, () => ago(OTP_WINDOW_MS + 1));
  assert.equal(isOtpSendAllowed(stale, now), true);
  const boundary = [...stale.slice(1), ago(OTP_WINDOW_MS - 1), ...Array.from({ length: OTP_SENDS_PER_WINDOW - 1 }, () => ago(1000))];
  assert.equal(isOtpSendAllowed(boundary, now), false);
});

test("OTP email carries the code in subject, text and html, and only digits", () => {
  const content = otpEmailContent("482913", "email-verification");
  assert.match(content.subject, /^482913 /);
  assert.match(content.text, /Your code: 482913/);
  assert.match(content.html, />482913</);
  assert.match(content.text, /15 minutes/);
  const hostile = otpEmailContent("12<b>34</b>56", "sign-in");
  assert.doesNotMatch(hostile.html, /<b>/);
  assert.match(hostile.html, />123456</);
});

test("OTP email copy differs per purpose", () => {
  assert.notEqual(otpEmailContent("111111", "email-verification").subject, otpEmailContent("111111", "forget-password").subject);
  assert.match(otpEmailContent("111111", "change-email").text, /new email/i);
});

test("phone normalisation accepts the formats the signup input can produce", () => {
  assert.equal(normalizePhoneNumber("9876543210"), "+919876543210");
  assert.equal(normalizePhoneNumber("09876543210"), "+919876543210");
  assert.equal(normalizePhoneNumber("919876543210"), "+919876543210");
  assert.equal(normalizePhoneNumber("+91 98765 43210"), "+919876543210");
  assert.equal(isValidIndianPhoneNumber("5876543210"), false, "Indian mobiles start 6-9");
  assert.equal(isValidIndianPhoneNumber("98765"), false);
});
