"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, LockKeyhole, Mail, ShieldCheck, Smartphone } from "lucide-react";
import { FormEvent, useState } from "react";

import { isValidIndianPhoneNumber, normalizePhoneNumber } from "@/lib/phone";

type Method = "email" | "phone";

function messageFrom(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const value = payload as { message?: string; error?: { message?: string } };
  return value.message ?? value.error?.message ?? fallback;
}

export function AdminLoginForm() {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("email");
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
      if (!response.ok) throw new Error(messageFrom(result, "Invalid administrator login details"));

      const access = await fetch("/api/admin/session", { cache: "no-store" });
      if (!access.ok) {
        await fetch("/api/auth/sign-out", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => null);
        throw new Error("This account does not have active administrator access");
      }

      router.replace("/admin");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Administrator sign-in could not be completed. Please retry.");
    } finally {
      setLoading(false);
    }
  }

  const fieldClass = "w-full rounded-lg border border-[#cfdaeb] bg-white px-3.5 py-3 text-[15px] outline-none transition focus:border-[#2864d7] focus:ring-2 focus:ring-[#2864d7]/10";

  return (
    <main className="min-h-screen bg-[#f3f7fd] px-4 py-7 text-[#162237] sm:px-6 sm:py-12">
      <div className="mx-auto max-w-[440px]">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#607089] hover:text-[#2457b8]">
          <ArrowLeft size={17} /> Back to storefront
        </Link>

        <section className="mt-7 rounded-lg border border-[#cfdaeb] bg-white p-5 shadow-[0_20px_55px_rgba(22,69,153,0.10)] sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image src="/images/mahavir-card-logo.jpeg" alt="Mahavir Card" width={48} height={48} priority className="size-12 rounded-full object-cover" />
              <div>
                <p className="text-lg font-bold">Mahavir Card</p>
                <p className="text-sm text-[#607089]">Admin workspace</p>
              </div>
            </div>
            <span className="grid size-10 place-items-center rounded-full bg-[#eaf1ff] text-[#2457b8]" aria-hidden="true"><ShieldCheck size={21} /></span>
          </div>

          <div className="mt-7">
            <h1 className="text-2xl font-bold tracking-[-0.03em]">Administrator sign in</h1>
            <p className="mt-2 text-[15px] leading-6 text-[#607089]">Use an active administrator account to open the operations workspace.</p>
          </div>

          <div className="mt-6 grid grid-cols-2 rounded-lg border border-[#cfdaeb] p-1">
            <button type="button" onClick={() => { setMethod("email"); setError(""); }} className={`flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold ${method === "email" ? "bg-[#eef4ff] text-[#1f51ad]" : "text-[#607089]"}`}>
              <Mail size={16} /> Email
            </button>
            <button type="button" onClick={() => { setMethod("phone"); setError(""); }} className={`flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold ${method === "phone" ? "bg-[#eef4ff] text-[#1f51ad]" : "text-[#607089]"}`}>
              <Smartphone size={16} /> Mobile
            </button>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {method === "email" ? (
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">Admin email</span>
                <div className="relative">
                  <Mail size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#72829a]" />
                  <input required type="email" id="admin-email" name="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className={`${fieldClass} pl-11`} />
                </div>
              </label>
            ) : (
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">Admin mobile number</span>
                <div className="relative">
                  <Smartphone size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#72829a]" />
                  <input required inputMode="tel" id="admin-tel" name="tel" autoComplete="username tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} className={`${fieldClass} pl-11`} />
                </div>
              </label>
            )}

            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Password</span>
              <div className="relative">
                <LockKeyhole size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#72829a]" />
                <input required type="password" id="admin-password" name="password" minLength={8} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className={`${fieldClass} pl-11`} />
              </div>
            </label>

            {error && <p role="alert" className="rounded-lg border border-[#efb7b7] bg-[#fff4f4] p-3 text-sm leading-5 text-[#9b2525]">{error}</p>}

            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#2864d7] px-5 py-3.5 text-[15px] font-bold text-white transition hover:bg-[#1f51ad] disabled:cursor-wait disabled:opacity-60">
              {loading ? "Verifying access..." : "Open admin workspace"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="mt-5 border-t border-[#e0e7f1] pt-5 text-center text-xs leading-5 text-[#72829a]">Access is restricted to active Mahavir Card administrators.</p>
        </section>
      </div>
    </main>
  );
}
