"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole, Mail, Pencil, PhoneCall, RotateCcw, ShieldCheck, Smartphone, UserRound } from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { isValidIndianPhoneNumber, normalizePhoneNumber } from "@/lib/phone";
import { commerceStates } from "@/lib/india-states";
import { authClient } from "@/lib/auth-client";

function isSafeNextPath(value: string | null): value is string {
  return Boolean(value) && value!.startsWith("/") && !value!.startsWith("//");
}

/** B2B customers land directly on the product listing (fast repeat ordering); B2C lands on the account overview. */
function destinationForCustomerType(customerType: string | null | undefined) {
  return customerType === "B2B" ? "/products" : "/account";
}

type Method = "email" | "phone";
type SignupStep = "form" | "otp";

function messageFrom(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const value = payload as { message?: string; error?: { message?: string } };
  return value.message ?? value.error?.message ?? fallback;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const [method, setMethod] = useState<Method>("email");
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [customerType, setCustomerType] = useState<"B2B" | "B2C">("B2C");
  const [companyName, setCompanyName] = useState("");
  const [city, setCity] = useState("");
  const [stateCode, setStateCode] = useState("GJ");
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [loading, setLoading] = useState(false);

  /* ── OTP verification state ── */
  const [signupStep, setSignupStep] = useState<SignupStep>("form");
  const [signupEmail, setSignupEmail] = useState("");
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editingEmailValue, setEditingEmailValue] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpExpiresAt, setOtpExpiresAt] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* Resend cooldown timer */
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  /* OTP expiry countdown */
  const [timeLeft, setTimeLeft] = useState(0);
  useEffect(() => {
    if (!otpExpiresAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((otpExpiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [otpExpiresAt]);

  const verifyOtp = useCallback(async (digitsToVerify?: string[]) => {
    const code = (digitsToVerify || otpDigits).join("");
    if (code.length < 6) return;
    setError("");
    setInfoMessage("");
    setLoading(true);
    try {
      const res = await authClient.emailOtp.verifyEmail({ email: signupEmail, otp: code });
      if (res.error) throw new Error(res.error.message || "Invalid verification code. Please check and try again.");

      // Establish active session if not already logged in
      if (password) {
        await authClient.signIn.email({ email: signupEmail, password, rememberMe: true }).catch(() => null);
      }

      // Save customer profile now that session is verified & active
      if (phoneNumber) {
        const normalizedPhone = normalizePhoneNumber(phoneNumber);
        const selectedState = commerceStates.find(([code]) => code === stateCode);
        await fetch("/api/account/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerType,
            contactName: name.trim(),
            companyName: companyName.trim() || null,
            phone: normalizedPhone,
            city: city.trim(),
            stateCode,
            state: selectedState?.[1] ?? "",
          }),
        }).catch(() => null);
      }

      // Email verified successfully — redirect
      router.replace(isSafeNextPath(nextParam) ? nextParam : destinationForCustomerType(customerType));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Verification failed. Please check your code and try again.");
      setOtpDigits(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }, [otpDigits, signupEmail, password, phoneNumber, name, companyName, city, stateCode, customerType, nextParam, router]);

  const handleOtpChange = useCallback((index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    setError("");
    const digit = value.slice(-1);
    setOtpDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      // If all 6 digits are now filled, auto verify
      if (digit && next.every((d) => d.length === 1)) {
        setTimeout(() => { void verifyOtp(next); }, 50);
      }
      return next;
    });
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }, [verifyOtp]);

  const handleOtpKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otpDigits[index] && index > 0) {
        e.preventDefault();
        otpRefs.current[index - 1]?.focus();
        setOtpDigits((prev) => {
          const next = [...prev];
          next[index - 1] = "";
          return next;
        });
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      otpRefs.current[index + 1]?.focus();
    } else if (e.key === "Enter") {
      e.preventDefault();
      void verifyOtp();
    }
  }, [otpDigits, verifyOtp]);

  const handleOtpPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    setError("");
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const digits = pasted.split("");
    const nextDigits = ["", "", "", "", "", ""];
    digits.forEach((d, i) => { nextDigits[i] = d; });
    setOtpDigits(nextDigits);

    if (pasted.length === 6) {
      setTimeout(() => { void verifyOtp(nextDigits); }, 50);
    } else {
      const focusIdx = Math.min(digits.length, 5);
      otpRefs.current[focusIdx]?.focus();
    }
  }, [verifyOtp]);

  /* ── Allow user to update email address during OTP verification ── */
  const handleUpdateEmailAndResend = useCallback(async () => {
    const trimmed = editingEmailValue.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (trimmed.toLowerCase() === signupEmail.toLowerCase()) {
      setIsEditingEmail(false);
      return;
    }

    setError("");
    setInfoMessage("");
    setLoading(true);

    try {
      // Attempt signup with the new email
      const signup = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: trimmed, password }),
      });
      const result = await signup.json().catch(() => null);

      // If user already exists (e.g. earlier unverified attempt), trigger OTP send directly
      if (!signup.ok) {
        const res = await authClient.emailOtp.sendVerificationOtp({
          email: trimmed,
          type: "email-verification",
        });
        if (res.error) throw new Error(res.error.message || messageFrom(result, "Could not update email"));
      }

      // Update state to new email
      setEmail(trimmed);
      setSignupEmail(trimmed);
      setIsEditingEmail(false);
      setOtpDigits(["", "", "", "", "", ""]);
      setOtpExpiresAt(Date.now() + 900_000);
      setResendCooldown(30);
      setInfoMessage(`Verification code sent to ${trimmed}`);
      setTimeout(() => { otpRefs.current[0]?.focus(); }, 100);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to update email. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [editingEmailValue, signupEmail, name, password]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignup) {
        if (!email.trim()) throw new Error("Email address is required for account verification");
        if (!isValidIndianPhoneNumber(phoneNumber)) throw new Error("Enter a valid 10-digit Indian mobile number");

        const finalEmail = email.trim();

        const signup = await fetch("/api/auth/sign-up/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), email: finalEmail, password }),
        });
        const result = await signup.json().catch(() => null);

        // If signup returned error, check if unverified account exists and trigger OTP
        if (!signup.ok) {
          const res = await authClient.emailOtp.sendVerificationOtp({
            email: finalEmail,
            type: "email-verification",
          });
          if (res.error) {
            throw new Error(messageFrom(result, "Could not create account or send verification code"));
          }
        }

        // Transition to OTP verification screen (profile will be saved once OTP is verified)
        setSignupEmail(finalEmail);
        setOtpDigits(["", "", "", "", "", ""]);
        setOtpExpiresAt(Date.now() + 900_000); // 15 min
        setResendCooldown(30);
        setSignupStep("otp");
        setError("");
        return;
      }

      if (method === "phone" && !isValidIndianPhoneNumber(phoneNumber)) throw new Error("Enter a valid 10-digit Indian mobile number");
      const endpoint = method === "email" ? "/api/auth/sign-in/email" : "/api/auth/sign-in/phone-number";
      const body = method === "email"
        ? { email: email.trim(), password, rememberMe: true }
        : { phoneNumber: normalizePhoneNumber(phoneNumber), password, rememberMe: true };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(messageFrom(result, "Invalid login details"));

      if (isSafeNextPath(nextParam)) {
        router.replace(nextParam);
      } else {
        // No explicit return-to: send B2B straight to the product listing (fastest repeat-order path),
        // B2C to the account overview. Determined from the customer record, not guessed.
        const profileResponse = await fetch("/api/account/profile", { cache: "no-store" });
        const profilePayload = await profileResponse.json().catch(() => null);
        const customerType = profileResponse.ok && profilePayload?.success ? profilePayload.data?.customer?.customerType : null;
        router.replace(destinationForCustomerType(customerType));
      }
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn't sign you in. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10";

  return (
    <main className="min-h-screen bg-[#fcfbf9] px-4 py-8 text-slate-900 sm:px-6 sm:py-12 flex flex-col justify-center items-center">
      <div className="w-full max-w-5xl">
        <div className="mb-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-[#1e3a5f] transition-colors"
          >
            <ArrowLeft size={16} /> Back to Mahavir Card Storefront
          </Link>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl grid lg:grid-cols-[1fr_1.15fr]">
          {/* LEFT: Split Brand & Print Studio Presentation (Desktop) */}
          <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-slate-950 p-10 text-white">
            <Image
              src="/images/auth-studio-banner.jpg"
              alt="Artisanal print and paper studio at Mahavir Card"
              fill
              priority
              sizes="50vw"
              className="object-cover opacity-35"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/40" />

            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <Image
                  src="/images/mahavir-card-logo.jpeg"
                  alt="Mahavir Card"
                  width={44}
                  height={44}
                  priority
                  className="size-11 rounded-full object-cover border-2 border-white/20"
                />
                <div>
                  <p className="text-base font-extrabold tracking-tight text-white leading-tight">Mahavir Card</p>
                  <p className="text-xs text-slate-300">Khadia Golwad, Ahmedabad</p>
                </div>
              </div>

              <div className="mt-12">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-200 backdrop-blur-md">
                  Customer Portal
                </span>
                <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white leading-tight">
                  Precision Commercial Printing
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  Access instant pricing, upload CDR artwork with automated pre-press guidelines, and track orders across Gujarat and Rajasthan.
                </p>
              </div>
            </div>

            <div className="relative z-10 border-t border-white/15 pt-6 text-xs text-slate-400 space-y-2.5">
              <p className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                Live wholesale &amp; retail price calculator
              </p>
              <p className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                Direct CorelDRAW CDR upload &amp; inspection
              </p>
              <p className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                Order dispatch history &amp; credit wallet management
              </p>
            </div>
          </div>

          {/* RIGHT: Form Workspace */}
          <section className="p-6 sm:p-10 flex flex-col justify-center">
            {/* Mobile Branding */}
            <div className="flex items-center gap-3 lg:hidden mb-6 pb-6 border-b border-slate-100">
              <Image
                src="/images/mahavir-card-logo.jpeg"
                alt="Mahavir Card"
                width={40}
                height={40}
                priority
                className="size-10 rounded-full object-cover"
              />
              <div>
                <p className="text-base font-bold text-slate-900">Mahavir Card</p>
                <p className="text-xs text-slate-500">Customer Account</p>
              </div>
            </div>

            {isSignup && signupStep === "otp" ? (
              /* ── OTP Verification Screen ── */
              <div className="flex flex-col items-center text-center">
                <div className="grid size-16 place-items-center rounded-2xl bg-[#edf4fb] border border-[#d5e3f1] mb-5">
                  <ShieldCheck size={30} className="text-[#1e3a5f]" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  Verify Your Email
                </h1>

                {!isEditingEmail ? (
                  <div className="mt-2 text-sm text-slate-600 max-w-md">
                    <p>
                      We sent a 6-digit code to{" "}
                      <strong className="text-slate-900 font-bold">{signupEmail}</strong>
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEmailValue(signupEmail);
                        setIsEditingEmail(true);
                        setError("");
                        setInfoMessage("");
                      }}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-[#1e3a5f] hover:underline"
                    >
                      <Pencil size={12} /> Change email address
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 w-full max-w-sm rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-left shadow-xs">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Enter Correct Email
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="email"
                        value={editingEmailValue}
                        onChange={(e) => setEditingEmailValue(e.target.value)}
                        placeholder="you@example.com"
                        className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void handleUpdateEmailAndResend();
                          } else if (e.key === "Escape") {
                            setIsEditingEmail(false);
                          }
                        }}
                      />
                      <button
                        type="button"
                        disabled={loading || !editingEmailValue.trim()}
                        onClick={handleUpdateEmailAndResend}
                        className="shrink-0 rounded-xl bg-[#1e3a5f] px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#152a45] disabled:opacity-50"
                      >
                        {loading ? "Saving..." : "Send Code"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingEmail(false)}
                        className="shrink-0 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Status and Error Messages */}
                {infoMessage && (
                  <div role="status" className="mt-3 w-full max-w-sm rounded-xl border border-emerald-200 bg-emerald-50/90 p-2.5 text-xs text-emerald-900 flex items-center justify-center gap-1.5">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>{infoMessage}</span>
                  </div>
                )}

                {error && (
                  <p role="alert" className="mt-3 w-full max-w-sm rounded-xl border border-red-200 bg-red-50/90 p-3 text-xs leading-relaxed text-red-900">
                    {error}
                  </p>
                )}

                {/* Timer */}
                {timeLeft > 0 ? (
                  <p className="mt-4 text-xs text-slate-500">
                    Code expires in{" "}
                    <span className="font-bold text-slate-900">
                      {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
                    </span>
                  </p>
                ) : otpExpiresAt > 0 ? (
                  <p className="mt-4 text-xs text-red-600 font-semibold">
                    Code expired. Please request a new code.
                  </p>
                ) : null}

                {/* 6-digit OTP input */}
                <div className="mt-5 flex items-center justify-center gap-2 sm:gap-2.5" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="size-11 sm:size-13 rounded-xl border-2 border-slate-200 bg-white text-center text-xl sm:text-2xl font-bold text-slate-900 outline-none transition focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/15"
                      autoFocus={i === 0}
                    />
                  ))}
                </div>

                {/* Verify button */}
                <button
                  type="button"
                  disabled={loading || otpDigits.some((d) => !d)}
                  onClick={() => verifyOtp()}
                  className="mt-6 flex w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-[#1e3a5f] px-5 py-3.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#152a45] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify & Continue"}
                  {!loading && <ArrowRight size={16} />}
                </button>

                {/* Resend */}
                <div className="mt-4 flex items-center gap-1 text-xs text-slate-500">
                  <span>Didn't get the code?</span>
                  {resendCooldown > 0 ? (
                    <span className="font-semibold text-slate-400">Resend in {resendCooldown}s</span>
                  ) : (
                    <button
                      type="button"
                      className="font-bold text-[#1e3a5f] hover:underline"
                      onClick={async () => {
                        setError("");
                        setInfoMessage("");
                        try {
                          const res = await authClient.emailOtp.sendVerificationOtp({
                            email: signupEmail,
                            type: "email-verification",
                          });
                          if (res.error) throw new Error(res.error.message || "Could not resend code");
                          setResendCooldown(30);
                          setOtpExpiresAt(Date.now() + 900_000);
                          setOtpDigits(["", "", "", "", "", ""]);
                          setInfoMessage("A new verification code has been sent.");
                          otpRefs.current[0]?.focus();
                        } catch (caught) {
                          setError(caught instanceof Error ? caught.message : "Failed to resend. Try again.");
                        }
                      }}
                    >
                      Resend Code
                    </button>
                  )}
                </div>

                {/* Back to form */}
                <button
                  type="button"
                  onClick={() => {
                    setSignupStep("form");
                    setError("");
                    setInfoMessage("");
                  }}
                  className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#1e3a5f] transition-colors"
                >
                  <ArrowLeft size={14} /> Back to sign up details
                </button>
              </div>
            ) : (
              /* ── Normal Sign In / Sign Up Form ── */
              <>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                    {isSignup ? "Create Customer Account" : "Welcome Back"}
                  </h1>
                  <p className="mt-1.5 text-sm text-slate-600">
                    {isSignup
                      ? "Register for instant ordering, CDR artwork upload, and live pricing."
                      : "Sign in to manage your orders, quotations, and account wallet."}
                  </p>
                </div>

                {/* Switch Sign In / Sign Up */}
                <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setIsSignup(false)}
                    className={`rounded-lg py-2 text-xs font-bold transition ${
                      !isSignup ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignup(true);
                      setMethod("email");
                      setError("");
                    }}
                    className={`rounded-lg py-2 text-xs font-bold transition ${
                      isSignup ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Create Account
                  </button>
                </div>

                {!isSignup && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMethod("email");
                        setError("");
                      }}
                      className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition ${
                        method === "email"
                          ? "border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Mail size={15} /> Email Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMethod("phone");
                        setError("");
                      }}
                      className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition ${
                        method === "phone"
                          ? "border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Smartphone size={15} /> Mobile Sign In
                    </button>
                  </div>
                )}

                {isSignup && (
                  <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/80 p-3.5 text-xs text-blue-950 flex items-start gap-2.5">
                    <PhoneCall size={18} className="text-[#1e3a5f] shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold text-[#1e3a5f]">Need help signing up?</strong>
                      <p className="mt-0.5 text-slate-700 leading-relaxed">
                        Not sure how to sign up or need help creating your account? Call or WhatsApp us directly at{" "}
                        <a href="tel:+919426371150" className="font-bold underline text-[#1e3a5f] hover:text-[#152a45]">
                          +91 94263 71150
                        </a>{" "}
                        and our team will assist you immediately.
                      </p>
                    </div>
                  </div>
                )}

                <form onSubmit={submit} className="mt-6 space-y-4">
                  {isSignup && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCustomerType("B2C")}
                          className={`rounded-xl border py-2.5 text-xs font-bold transition ${
                            customerType === "B2C"
                              ? "border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]"
                              : "border-slate-200 text-slate-600"
                          }`}
                        >
                          Individual (B2C)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomerType("B2B")}
                          className={`rounded-xl border py-2.5 text-xs font-bold transition ${
                            customerType === "B2B"
                              ? "border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]"
                              : "border-slate-200 text-slate-600"
                          }`}
                        >
                          Business (B2B)
                        </button>
                      </div>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Full Name</span>
                        <div className="relative">
                          <UserRound size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            required
                            id="signup-name"
                            name="name"
                            autoComplete="name"
                            minLength={2}
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            className={`${fieldClass} pl-10`}
                          />
                        </div>
                      </label>
                      {customerType === "B2B" ? (
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Company Name</span>
                          <input
                            required
                            id="signup-company"
                            name="organization"
                            autoComplete="organization"
                            value={companyName}
                            onChange={(event) => setCompanyName(event.target.value)}
                            className={fieldClass}
                          />
                        </label>
                      ) : null}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">City</span>
                          <input
                            required
                            id="signup-city"
                            name="address-level2"
                            autoComplete="address-level2"
                            value={city}
                            onChange={(event) => setCity(event.target.value)}
                            className={fieldClass}
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">State</span>
                          <select
                            required
                            id="signup-state"
                            name="address-level1"
                            autoComplete="address-level1"
                            value={stateCode}
                            onChange={(event) => setStateCode(event.target.value)}
                            className={fieldClass}
                          >
                            {commerceStates.map(([code, state]) => (
                              <option key={code} value={code}>
                                {state}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </>
                  )}

                  {(method === "email" || isSignup) && (
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                        Email Address
                      </span>
                      <div className="relative">
                        <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          required
                          type="email"
                          id={isSignup ? "signup-email" : "signin-email"}
                          name="email"
                          autoComplete={isSignup ? "email" : "username email"}
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          className={`${fieldClass} pl-10`}
                        />
                      </div>
                    </label>
                  )}

                  {(method === "phone" || isSignup) && (
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Mobile Number</span>
                      <div className="relative">
                        <Smartphone size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          required
                          inputMode="tel"
                          id={isSignup ? "signup-phone" : "signin-phone"}
                          name={isSignup ? "tel" : method === "phone" ? "username tel" : "tel"}
                          autoComplete={isSignup ? "tel" : "username tel"}
                          value={phoneNumber}
                          onChange={(event) => setPhoneNumber(event.target.value)}
                          className={`${fieldClass} pl-10`}
                        />
                      </div>
                    </label>
                  )}

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Password</span>
                    <div className="relative">
                      <LockKeyhole size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        required
                        type="password"
                        minLength={8}
                        id={isSignup ? "signup-password" : "signin-password"}
                        name="password"
                        autoComplete={isSignup ? "new-password" : "current-password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className={`${fieldClass} pl-10`}
                      />
                    </div>
                    {isSignup && <span className="mt-1.5 block text-[11px] text-slate-500">Must be at least 8 characters.</span>}
                  </label>

                  {error && (
                    <p role="alert" className="rounded-xl border border-red-200 bg-red-50/70 p-3.5 text-xs leading-relaxed text-red-900">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1e3a5f] px-5 py-3.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#152a45] disabled:cursor-wait disabled:opacity-60"
                  >
                    {loading ? "Processing..." : isSignup ? "Create Account & Verify Email" : "Sign In to Account"}
                    {!loading && <ArrowRight size={16} />}
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

