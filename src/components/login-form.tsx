"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, LockKeyhole, Mail, Smartphone } from "lucide-react";
import { FormEvent, useState } from "react";

import { normalizePhoneNumber } from "@/lib/phone";

type Mode = "admin" | "customer";
type Method = "email" | "phone";

export function LoginForm({ initialMode }: { initialMode: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
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
        const signup = await fetch("/api/auth/sign-up/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
        const result = await signup.json();
        if (!signup.ok) throw new Error(result.message ?? result.error?.message ?? "Could not create the account");
        if (phoneNumber.trim()) {
          const phoneResponse = await fetch("/api/account/phone", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phoneNumber }) });
          if (!phoneResponse.ok) throw new Error((await phoneResponse.json()).error?.message ?? "Account created, but mobile number could not be saved");
        }
        router.push("/account");
        return;
      }

      const endpoint = method === "email" ? "/api/auth/sign-in/email" : "/api/auth/sign-in/phone-number";
      const body = method === "email" ? { email, password, rememberMe: true } : { phoneNumber: normalizePhoneNumber(phoneNumber), password, rememberMe: true };
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? result.error?.message ?? "Invalid login details");
      router.push(mode === "admin" ? "/admin" : "/account");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="min-h-screen bg-[#f8f7f3] px-5 py-8 text-[#18231e] sm:py-14"><div className="mx-auto max-w-md"><Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#646b64] hover:text-[#f15a3a]"><ArrowLeft size={16} /> Back to Mahavir Card</Link><div className="mt-10 border border-[#d9d6ce] bg-white p-6 sm:p-8"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center bg-[#f15a3a] font-black text-white">M</span><div><p className="text-lg font-bold">mahavir<span className="text-[#f15a3a]">card</span></p><p className="text-xs uppercase tracking-[0.12em] text-[#858a83]">Secure account access</p></div></div><div className="mt-8 grid grid-cols-2 border-b border-[#ddd9d0]"><button type="button" onClick={() => { setMode("customer"); setIsSignup(false); }} className={`border-b-2 px-3 py-3 text-sm font-bold ${mode === "customer" ? "border-[#f15a3a] text-[#18231e]" : "border-transparent text-[#858a83]"}`}>Customer</button><button type="button" onClick={() => { setMode("admin"); setIsSignup(false); }} className={`border-b-2 px-3 py-3 text-sm font-bold ${mode === "admin" ? "border-[#f15a3a] text-[#18231e]" : "border-transparent text-[#858a83]"}`}>Admin</button></div>{mode === "customer" && <div className="mt-5 flex gap-2"><button type="button" onClick={() => setIsSignup(false)} className={`flex-1 border px-3 py-2 text-sm font-semibold ${!isSignup ? "border-[#18231e] bg-[#18231e] text-white" : "border-[#d9d6ce]"}`}>Sign in</button><button type="button" onClick={() => { setIsSignup(true); setMethod("email"); }} className={`flex-1 border px-3 py-2 text-sm font-semibold ${isSignup ? "border-[#18231e] bg-[#18231e] text-white" : "border-[#d9d6ce]"}`}>Create account</button></div>}{!isSignup && <div className="mt-5 grid grid-cols-2 border border-[#d9d6ce] p-1"><button type="button" onClick={() => setMethod("email")} className={`flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold ${method === "email" ? "bg-[#f1eee7]" : "text-[#858a83]"}`}><Mail size={15} /> Email</button><button type="button" onClick={() => setMethod("phone")} className={`flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold ${method === "phone" ? "bg-[#f1eee7]" : "text-[#858a83]"}`}><Smartphone size={15} /> Mobile</button></div>}<form onSubmit={submit} className="mt-6 space-y-4">{isSignup && <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-[#646b64]">Full name</span><input required value={name} onChange={(event) => setName(event.target.value)} className="w-full border border-[#d9d6ce] bg-[#fbfaf7] px-3 py-3 text-sm outline-none focus:border-[#f15a3a]" /></label>}{(method === "email" || isSignup) && <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-[#646b64]">Email address</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full border border-[#d9d6ce] bg-[#fbfaf7] px-3 py-3 text-sm outline-none focus:border-[#f15a3a]" /></label>}{!isSignup && method === "phone" && <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-[#646b64]">Mobile number</span><input required inputMode="tel" placeholder="98765 43210" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} className="w-full border border-[#d9d6ce] bg-[#fbfaf7] px-3 py-3 text-sm outline-none focus:border-[#f15a3a]" /></label>}{isSignup && <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-[#646b64]">Mobile number <span className="font-normal text-[#858a83]">(optional)</span></span><input inputMode="tel" placeholder="98765 43210" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} className="w-full border border-[#d9d6ce] bg-[#fbfaf7] px-3 py-3 text-sm outline-none focus:border-[#f15a3a]" /></label>}<label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-[#646b64]">Password</span><div className="flex items-center border border-[#d9d6ce] bg-[#fbfaf7] px-3"><LockKeyhole size={16} className="text-[#858a83]" /><input required type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none" /></div></label>{error && <p className="bg-[#fde2dc] p-3 text-sm leading-5 text-[#9d2f1d]">{error}</p>}<button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 bg-[#f15a3a] px-4 py-3.5 text-sm font-bold text-white hover:bg-[#18231e] disabled:cursor-wait disabled:opacity-60">{loading ? "Please wait..." : isSignup ? "Create customer account" : `Sign in as ${mode === "admin" ? "admin" : "customer"}`} {!loading && <ArrowRight size={17} />}</button></form></div></div></main>;
}
