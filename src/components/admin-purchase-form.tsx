"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

type PurchaseFormProps = {
  initial?: {
    id: string;
    date: string;
    partyName: string;
    partyGstin: string | null;
    billNo: string;
    hsnCode: string;
    description: string | null;
    qty: string | null;
    qtyUnit: string | null;
    taxValue: string;
    taxType: string;
    cgstRate: string;
    sgstRate: string;
    igstRate: string;
    roundOff: string;
    notes: string | null;
  };
};

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function AdminPurchaseForm({ initial }: PurchaseFormProps) {
  const router = useRouter();
  const isEdit = !!initial?.id;

  const [form, setForm] = useState({
    date: initial?.date ? initial.date.slice(0, 10) : today(),
    partyName: initial?.partyName || "",
    partyGstin: initial?.partyGstin || "",
    billNo: initial?.billNo || "",
    hsnCode: initial?.hsnCode || "4802",
    description: initial?.description || "",
    qty: initial?.qty || "",
    qtyUnit: initial?.qtyUnit || "PCS",
    taxValue: initial?.taxValue || "",
    taxType: initial?.taxType || "INTRA_STATE",
    gstRate: initial ? (Number(initial.cgstRate) + Number(initial.sgstRate) + Number(initial.igstRate)).toString() : "18",
    roundOff: initial?.roundOff || "",
    notes: initial?.notes || "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Computed GST values
  const taxValue = Number(form.taxValue) || 0;
  const gstRate = Number(form.gstRate) || 0;
  const isIntra = form.taxType === "INTRA_STATE";
  const isInter = form.taxType === "INTER_STATE";
  const cgstRate = isIntra ? gstRate / 2 : 0;
  const sgstRate = isIntra ? gstRate / 2 : 0;
  const igstRate = isInter ? gstRate : 0;
  const cgstAmount = Number(((taxValue * cgstRate) / 100).toFixed(2));
  const sgstAmount = Number(((taxValue * sgstRate) / 100).toFixed(2));
  const igstAmount = Number(((taxValue * igstRate) / 100).toFixed(2));
  const rawTotal = taxValue + cgstAmount + sgstAmount + igstAmount;
  const customRoundOff = form.roundOff !== "" ? Number(form.roundOff) : Number((Math.round(rawTotal) - rawTotal).toFixed(2));
  const totalValue = Number((rawTotal + customRoundOff).toFixed(2));

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        partyName: form.partyName,
        partyGstin: form.partyGstin || null,
        billNo: form.billNo,
        hsnCode: form.hsnCode,
        description: form.description || null,
        qty: form.qty || null,
        qtyUnit: form.qtyUnit,
        taxValue: Number(form.taxValue),
        taxType: form.taxType,
        cgstRate,
        sgstRate,
        igstRate,
        roundOff: customRoundOff,
        notes: form.notes || null,
      };

      const url = isEdit ? `/api/admin/purchases/${initial!.id}` : "/api/admin/purchases";
      const res = await fetch(url, { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();

      if (!json.success) { setError(json.error?.message || "Failed to save"); return; }
      router.push("/admin/purchases");
      router.refresh();
    } catch { setError("Network error. Please try again."); }
    finally { setSaving(false); }
  };

  const inputCls = "w-full rounded-lg border border-[#d7dce5] bg-[#f9fafb] px-3 py-2 text-sm text-[#162237] placeholder-[#a0aec0] focus:border-[#7B3F8D] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#7B3F8D]";
  const labelCls = "block mb-1 text-xs font-semibold text-[#607089] uppercase tracking-wide";
  const displayCls = "w-full rounded-lg border border-[#e8ecf1] bg-[#f0f2f5] px-3 py-2 text-sm font-mono text-[#607089]";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/purchases" className="rounded-lg border border-[#d7dce5] p-2 text-[#607089] hover:bg-[#f5f7fa]"><ArrowLeft size={16} /></Link>
        <div>
          <h1 className="text-xl font-bold text-[#162237]">{isEdit ? "Edit Purchase" : "Add Purchase Entry"}</h1>
          <p className="text-sm text-[#607089]">Manually log a purchase bill with GST breakdown</p>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section: Party Details */}
        <div className="rounded-xl border border-[#d7dce5] bg-white p-5 space-y-4">
          <h2 className="text-sm font-bold text-[#7B3F8D] uppercase tracking-wider">Party Details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Date *</label>
              <input type="date" required value={form.date} onChange={(e) => set("date", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Bill Number *</label>
              <input type="text" required placeholder="e.g. 431" value={form.billNo} onChange={(e) => set("billNo", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Party Name *</label>
              <input type="text" required placeholder="e.g. VEDANSH INDUSTRIES" value={form.partyName} onChange={(e) => set("partyName", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Party GSTIN</label>
              <input type="text" placeholder="e.g. 24AIOPA4327J2ZC" maxLength={15} value={form.partyGstin} onChange={(e) => set("partyGstin", e.target.value.toUpperCase())} className={`${inputCls} font-mono tracking-wider`} />
            </div>
          </div>
        </div>

        {/* Section: Item Details */}
        <div className="rounded-xl border border-[#d7dce5] bg-white p-5 space-y-4">
          <h2 className="text-sm font-bold text-[#7B3F8D] uppercase tracking-wider">Item Details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>HSN Code</label>
              <input type="text" value={form.hsnCode} onChange={(e) => set("hsnCode", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Qty</label>
              <input type="number" step="0.001" min="0" value={form.qty} onChange={(e) => set("qty", e.target.value)} placeholder="e.g. 500" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Unit</label>
              <select value={form.qtyUnit} onChange={(e) => set("qtyUnit", e.target.value)} className={inputCls}>
                {["PCS","KG","SHEETS","REAMS","MTR","LTR","BOX"].map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <input type="text" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="e.g. ART PAPER 130 GSM" className={inputCls} />
          </div>
        </div>

        {/* Section: GST Calculation */}
        <div className="rounded-xl border border-[#d7dce5] bg-white p-5 space-y-4">
          <h2 className="text-sm font-bold text-[#7B3F8D] uppercase tracking-wider">Tax Calculation</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Taxable Value (₹) *</label>
              <input type="number" required step="0.01" min="0" value={form.taxValue} onChange={(e) => set("taxValue", e.target.value)} placeholder="0.00" className={`${inputCls} font-mono`} />
            </div>
            <div>
              <label className={labelCls}>GST Rate %</label>
              <select value={form.gstRate} onChange={(e) => set("gstRate", e.target.value)} className={inputCls}>
                {["0","5","12","18","28"].map((r) => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Tax Type</label>
              <select value={form.taxType} onChange={(e) => set("taxType", e.target.value)} className={inputCls}>
                <option value="INTRA_STATE">Intra-State (CGST+SGST)</option>
                <option value="INTER_STATE">Inter-State (IGST)</option>
                <option value="EXEMPT">Exempt</option>
              </select>
            </div>
          </div>

          {/* Computed breakdown */}
          <div className="rounded-lg bg-[#faf5fb] border border-[#e8d5f0] p-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {isIntra && <>
              <div><p className="text-xs text-[#607089]">CGST ({cgstRate}%)</p><p className="font-mono font-semibold text-[#162237]">₹ {cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p></div>
              <div><p className="text-xs text-[#607089]">SGST ({sgstRate}%)</p><p className="font-mono font-semibold text-[#162237]">₹ {sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p></div>
            </>}
            {isInter && <div className="col-span-2"><p className="text-xs text-[#607089]">IGST ({igstRate}%)</p><p className="font-mono font-semibold text-[#162237]">₹ {igstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p></div>}
            <div>
              <p className="text-xs text-[#607089]">Round Off</p>
              <input type="number" step="0.01" value={form.roundOff !== "" ? form.roundOff : customRoundOff} onChange={(e) => set("roundOff", e.target.value)} className="w-full rounded border border-[#d7dce5] bg-white px-2 py-1 text-sm font-mono text-[#162237] focus:outline-none focus:border-[#7B3F8D]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#7B3F8D]">Total Value</p>
              <p className="font-mono text-lg font-bold text-[#7B3F8D]">₹ {totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div>
            <label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Internal notes (optional)" rows={2} className={`${inputCls} resize-none`} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/admin/purchases" className="rounded-lg border border-[#d7dce5] px-4 py-2 text-sm font-semibold text-[#607089] hover:bg-[#f5f7fa]">Cancel</Link>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#7B3F8D] px-5 py-2 text-sm font-semibold text-white hover:bg-[#6a3479] disabled:opacity-60 transition-colors">
            <Save size={15} /> {saving ? "Saving…" : isEdit ? "Update Purchase" : "Save Purchase"}
          </button>
        </div>
      </form>
    </div>
  );
}