"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, LockKeyhole, Mail, Smartphone, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";

import { isValidIndianPhoneNumber, normalizePhoneNumber } from "@/lib/phone";
import { commerceStates } from "@/lib/india-states";

function isSafeNextPath(value: string | null): value is string {
  return Boolean(value) && value!.startsWith("/") && !value!.startsWith("//");
}

/** B2B customers land directly on the product listing (fast repeat ordering); B2C lands on the account overview. */
function destinationForCustomerType(customerType: string | null | undefined) {
  return customerType === "B2B" ? "/products" : "/account";
}

type Method = "email" | "phone";

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
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignup) {
        if (!isValidIndianPhoneNumber(phoneNumber)) throw new Error("Enter a valid 10-digit Indian mobile number");

        const normalizedPhone = normalizePhoneNumber(phoneNumber);
        const digitsOnly = normalizedPhone.replace(/\D/g, "");
        const finalEmail = email.trim() || `${digitsOnly}@customer.mahavircard.com`;

        const signup = await fetch("/api/auth/sign-up/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), email: finalEmail, password }),
        });
        const result = await signup.json().catch(() => null);
        if (!signup.ok) throw new Error(messageFrom(result, "Could not create the account"));

        // Mobile number and customer profile are saved together in one transactional
        // call (see api/account/profile POST) so a failure here can't leave the account
        // half-set-up the way two separate requests could.
        const selectedState = commerceStates.find(([code]) => code === stateCode);
        const profileResponse = await fetch("/api/account/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerType, contactName: name.trim(), companyName: companyName.trim() || null, phone: normalizedPhone, city: city.trim(), stateCode, state: selectedState?.[1] ?? "" }),
        });
        const profileResult = await profileResponse.json().catch(() => null);
        if (!profileResponse.ok) throw new Error(messageFrom(profileResult, "Your account was created, but the profile could not be saved. Please try signing in and completing your profile."));

        router.replace(isSafeNextPath(nextParam) ? nextParam : destinationForCustomerType(customerType));
        router.refresh();
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
                    Email Address {isSignup ? <span className="font-normal text-slate-400">(optional)</span> : null}
                  </span>
                  <div className="relative">
                    <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      required={!isSignup}
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
                {loading ? "Processing..." : isSignup ? "Create Customer Account" : "Sign In to Account"}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
