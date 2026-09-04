"use client";

import { CheckCircle2, Save } from "lucide-react";
import { useEffect, useState } from "react";

import { citiesForState, commerceStates, indiaStateName } from "@/lib/india-states";

type ProfilePayload = {
  user: { name: string; email: string; phoneNumber?: string | null };
  customer: { contactName: string; companyName: string; phone: string | null; customerType: "B2B" | "B2C"; city: string | null; state: string | null; stateCode: string | null; gstNumber: string | null } | null;
  address: { line1: string; line2: string | null; postalCode: string } | null;
  profileComplete: boolean;
};

const fieldClass = "mt-1.5 w-full rounded-lg border border-[var(--mc-line)] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[var(--mc-accent)] transition-colors";

export function CustomerProfileForm() {
  const [data, setData] = useState<ProfilePayload | null>(null);
  const [form, setForm] = useState({ contactName: "", companyName: "", phone: "", city: "", stateCode: "GJ", gstNumber: "", line1: "", line2: "", postalCode: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/account/profile", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.error?.message ?? "Profile could not be loaded.");
        const next = payload.data as ProfilePayload;
        setData(next);
        setForm({
          contactName: next.customer?.contactName ?? next.user.name ?? "",
          companyName: next.customer?.companyName ?? "",
          phone: next.customer?.phone ?? next.user.phoneNumber ?? "",
          city: next.customer?.city ?? "",
          stateCode: next.customer?.stateCode ?? "GJ",
          gstNumber: next.customer?.gstNumber ?? "",
          line1: next.address?.line1 ?? "",
          line2: next.address?.line2 ?? "",
          postalCode: next.address?.postalCode ?? "",
        });
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Profile could not be loaded.");
      } finally {
        setLoading(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const hasAddress = Boolean(form.line1.trim() || form.postalCode.trim());
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactName: form.contactName,
          companyName: form.companyName || null,
          phone: form.phone,
          city: form.city,
          stateCode: form.stateCode,
          state: indiaStateName(form.stateCode),
          gstNumber: form.gstNumber || null,
          address: hasAddress ? { line1: form.line1, line2: form.line2 || null, postalCode: form.postalCode } : null,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error?.message ?? "Profile could not be saved.");
      setData((current) => current ? { ...current, customer: { ...current.customer!, ...form, state: indiaStateName(form.stateCode), gstNumber: form.gstNumber || null }, profileComplete: payload.data.profileComplete } : current);
      setMessage("Profile saved successfully.");
      setTimeout(() => setMessage(""), 4000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Profile could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <ProfileSkeleton />;
  if (!data) return <p role="alert" className="rounded-xl border border-[#efc4be] bg-white p-4 text-sm text-[#a9362c]">{error || "Profile could not be loaded."}</p>;

  return <form onSubmit={submit} className="space-y-6">
    <header className="border-b border-[var(--mc-line)] pb-6">
      <p className="text-xs font-bold uppercase text-[var(--mc-accent)]">Customer profile</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold text-[var(--mc-ink)]">Account details</h1><p className="mt-2 text-sm text-[var(--mc-muted)]">{data.customer?.customerType ?? "Customer"} account. Account type can only be changed by Mahavir Card.</p></div>{data.profileComplete ? <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f2fbf6] px-3 py-1 text-xs font-bold text-[#187044] border border-[#b9dec9]"><CheckCircle2 size={15} />Profile complete</span> : null}</div>
    </header>
    <section className="rounded-xl border border-[var(--mc-line)] bg-white p-5 sm:p-6 shadow-sm"><h2 className="font-bold text-lg text-[var(--mc-ink)]">Contact and business</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">
      <Field label="Person name" value={form.contactName} onChange={update("contactName")} required />
      <Field label="Company name" value={form.companyName} onChange={update("companyName")} required={data.customer?.customerType === "B2B"} />
      <Field label="Phone" value={form.phone} onChange={update("phone")} required />
      <label className="block text-sm font-semibold text-[var(--mc-ink)]">Email<input value={data.user.email} disabled className={fieldClass + " bg-[var(--mc-surface)] text-[var(--mc-muted)] cursor-not-allowed"} /><span className="mt-1 block text-xs font-normal text-[var(--mc-muted)]">Email is linked to your login.</span></label>
      <label className="block text-sm font-semibold text-[var(--mc-ink)]">City<input required list="profile-city-options" value={form.city} onChange={update("city")} className={fieldClass} /><datalist id="profile-city-options">{citiesForState(form.stateCode).map((city) => <option key={city} value={city} />)}</datalist></label>
      <label className="block text-sm font-semibold text-[var(--mc-ink)]">State<select value={form.stateCode} onChange={update("stateCode")} className={fieldClass}>{commerceStates.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
      <label className="block text-sm font-semibold text-[var(--mc-ink)] sm:col-span-2">GSTIN <span className="font-normal text-[var(--mc-muted)]">(optional)</span><input value={form.gstNumber} onChange={update("gstNumber")} maxLength={15} className={fieldClass} placeholder="15-character GSTIN" /></label>
    </div></section>
    <section className="rounded-xl border border-[var(--mc-line)] bg-white p-5 sm:p-6 shadow-sm"><h2 className="font-bold text-lg text-[var(--mc-ink)]">Default delivery address</h2><p className="mt-1 text-sm text-[var(--mc-muted)]">Optional now; it can also be completed during checkout.</p><div className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-semibold text-[var(--mc-ink)] sm:col-span-2">Address line 1<input value={form.line1} onChange={update("line1")} required={Boolean(form.postalCode)} className={fieldClass} /></label>
      <label className="block text-sm font-semibold text-[var(--mc-ink)] sm:col-span-2">Address line 2 <span className="font-normal text-[var(--mc-muted)]">(optional)</span><input value={form.line2} onChange={update("line2")} className={fieldClass} /></label>
      <Field label="Postal code" value={form.postalCode} onChange={update("postalCode")} required={Boolean(form.line1)} />
    </div></section>
    {error ? <p role="alert" className="rounded-xl border border-[#efc4be] bg-[#fff6f4] p-3.5 text-sm text-[#a9362c]">{error}</p> : null}
    {message ? <p className="rounded-xl border border-[#b9dec9] bg-[#f2fbf6] p-3.5 text-sm font-semibold text-[#187044]">{message}</p> : null}
    <div className="flex justify-end"><button disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-[var(--mc-accent)] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-[var(--mc-accent-dark)] transition-colors disabled:opacity-60"><Save size={17} />{saving ? "Saving..." : "Save profile"}</button></div>
  </form>;
}

function Field({ label, value, onChange, required }: { label: string; value: string; onChange: (event: React.ChangeEvent<HTMLInputElement>) => void; required?: boolean }) {
  return <label className="block text-sm font-semibold text-[var(--mc-ink)]">{label}<input required={required} value={value} onChange={onChange} className={fieldClass} /></label>;
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-[#dce4f0]" />
      <div className="rounded-xl border border-[var(--mc-line)] bg-white p-6 h-72" />
      <div className="rounded-xl border border-[var(--mc-line)] bg-white p-6 h-56" />
    </div>
  );
}
