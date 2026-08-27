"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, LockKeyhole, Mail, Smartphone, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";

import { isValidIndianPhoneNumber, normalizePhoneNumber } from "@/lib/phone";

type Method = "email" | "phone";

function messageFrom(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const value = payload as { message?: string; error?: { message?: string } };
  return value.message ?? value.error?.message ?? fallback;
}

export function LoginForm() {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("email");
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignup) {
        if (!isValidIndianPhoneNumber(phoneNumber)) throw new Error("Enter a valid 10-digit Indian mobile number");

        const signup = await fetch("/api/auth/sign-up/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
        });
        const result = await signup.json().catch(() => null);
        if (!signup.ok) throw new Error(messageFrom(result, "Could not create the account"));

        const phoneResponse = await fetch("/api/account/phone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneNumber: normalizePhoneNumber(phoneNumber) }),
        });
        const phoneResult = await phoneResponse.json().catch(() => null);
        if (!phoneResponse.ok) throw new Error(messageFrom(phoneResult, "Account created, but the mobile number could not be saved"));

        router.replace("/account");
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

      router.replace("/account");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const fieldClass = "w-full rounded-lg border border-[var(--mc-line)] bg-white px-3.5 py-3 text-[15px] outline-none transition focus:border-[var(--mc-accent)] focus:ring-2 focus:ring-[var(--mc-accent)]/10";

  return (
    <main className="min-h-screen bg-[var(--mc-soft)] px-4 py-7 text-[var(--mc-ink)] sm:px-6 sm:py-12">
      <div className="mx-auto max-w-[460px]">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--mc-muted)] hover:text-[var(--mc-accent)]">
          <ArrowLeft size={17} /> Back to Mahavir Card
        </Link>

        <section className="mt-7 rounded-lg border border-[var(--mc-line)] bg-white p-5 shadow-[0_18px_50px_rgba(22,69,153,0.08)] sm:p-8">
          <div className="flex items-center gap-3">
            <Image src="/images/mahavir-card-logo.jpeg" alt="Mahavir Card" width={48} height={48} priority className="size-12 rounded-full object-cover" />
            <div>
              <p className="text-lg font-bold">Mahavir Card</p>
              <p className="text-sm text-[var(--mc-muted)]">Customer account</p>
            </div>
          </div>

          <div className="mt-7">
            <h1 className="text-2xl font-bold tracking-[-0.03em]">{isSignup ? "Create your account" : "Welcome back"}</h1>
            <p className="mt-2 text-[15px] leading-6 text-[var(--mc-muted)]">
              {isSignup ? "Save your details and manage orders, quotes, and artwork." : "Sign in to manage your orders, quotes, and artwork."}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 rounded-lg bg-[var(--mc-soft)] p-1">
            <button type="button" onClick={() => setIsSignup(false)} className={`rounded-md px-3 py-2.5 text-sm font-semibold transition ${!isSignup ? "bg-white text-[var(--mc-ink)] shadow-sm" : "text-[var(--mc-muted)]"}`}>
              Sign in
            </button>
            <button type="button" onClick={() => { setIsSignup(true); setMethod("email"); setError(""); }} className={`rounded-md px-3 py-2.5 text-sm font-semibold transition ${isSignup ? "bg-white text-[var(--mc-ink)] shadow-sm" : "text-[var(--mc-muted)]"}`}>
              Create account
            </button>
          </div>

          {!isSignup && (
            <div className="mt-5 grid grid-cols-2 rounded-lg border border-[var(--mc-line)] p-1">
              <button type="button" onClick={() => { setMethod("email"); setError(""); }} className={`flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold ${method === "email" ? "bg-[var(--mc-soft)] text-[var(--mc-accent-dark)]" : "text-[var(--mc-muted)]"}`}>
                <Mail size={16} /> Email
              </button>
              <button type="button" onClick={() => { setMethod("phone"); setError(""); }} className={`flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold ${method === "phone" ? "bg-[var(--mc-soft)] text-[var(--mc-accent-dark)]" : "text-[var(--mc-muted)]"}`}>
                <Smartphone size={16} /> Mobile
              </button>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            {isSignup && (
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">Full name</span>
                <div className="relative">
                  <UserRound size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--mc-muted)]" />
                  <input required autoComplete="name" minLength={2} value={name} onChange={(event) => setName(event.target.value)} className={`${fieldClass} pl-11`} />
                </div>
              </label>
            )}

            {(method === "email" || isSignup) && (
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">Email address</span>
                <div className="relative">
                  <Mail size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--mc-muted)]" />
                  <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={`${fieldClass} pl-11`} />
                </div>
              </label>
            )}

            {(method === "phone" || isSignup) && (
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">Mobile number</span>
                <div className="relative">
                  <Smartphone size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--mc-muted)]" />
                  <input required inputMode="tel" autoComplete="tel" placeholder="98765 43210" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} className={`${fieldClass} pl-11`} />
                </div>
              </label>
            )}

            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Password</span>
              <div className="relative">
                <LockKeyhole size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--mc-muted)]" />
                <input required type="password" minLength={8} autoComplete={isSignup ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} className={`${fieldClass} pl-11`} />
              </div>
              {isSignup && <span className="mt-2 block text-xs text-[var(--mc-muted)]">Use at least 8 characters.</span>}
            </label>

            {error && <p role="alert" className="rounded-lg border border-[#efb7b7] bg-[#fff4f4] p-3 text-sm leading-5 text-[#9b2525]">{error}</p>}

            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--mc-accent)] px-5 py-3.5 text-[15px] font-bold text-white transition hover:bg-[var(--mc-accent-dark)] disabled:cursor-wait disabled:opacity-60">
              {loading ? "Please wait..." : isSignup ? "Create customer account" : "Sign in"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
