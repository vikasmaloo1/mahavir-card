"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building, Plus, Save, Trash2, User } from "lucide-react";
import Link from "next/link";

export type PurchaseItem = {
  id: string;
  description: string;
  hsnCode: string;
  quantity: number | string;
  unit: string;
  rate: number | string;
  amount: number;
};

type PartySuggestion = {
  name: string;
  companyName?: string;
  gstin: string;
  phone?: string;
  city?: string;
  source: "SUPPLIER" | "CUSTOMER";
};

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
    items?: Array<{
      id?: string;
      description: string;
      hsnCode: string;
      quantity: number;
      unit?: string;
      rate: number;
      amount: number;
    }> | null;
  };
};

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const UNIT_OPTIONS = ["PCS", "KG", "SHEETS", "REAMS", "PKT", "MTR", "LTR", "BOX", "ROLL", "SET"];

export function AdminPurchaseForm({ initial }: PurchaseFormProps) {
  const router = useRouter();
  const isEdit = !!initial?.id;

  // Party & Bill Info
  const [date, setDate] = useState(initial?.date ? initial.date.slice(0, 10) : today());
  const [billNo, setBillNo] = useState(initial?.billNo || "");
  const [partyName, setPartyName] = useState(initial?.partyName || "");
  const [partyGstin, setPartyGstin] = useState(initial?.partyGstin || "");
  const [notes, setNotes] = useState(initial?.notes || "");

  // Autocomplete suggestions for party name
  const [suggestions, setSuggestions] = useState<PartySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const suggestionContainerRef = useRef<HTMLDivElement>(null);

  // Multiple Items State
  const [items, setItems] = useState<PurchaseItem[]>(() => {
    if (initial?.items && Array.isArray(initial.items) && initial.items.length > 0) {
      return initial.items.map((it, idx) => ({
        id: it.id || `item-${idx + 1}`,
        description: it.description || "",
        hsnCode: it.hsnCode || "4802",
        quantity: it.quantity ?? 1,
        unit: it.unit || initial.qtyUnit || "PCS",
        rate: it.rate ?? 0,
        amount: Number(it.amount ?? (Number(it.quantity || 0) * Number(it.rate || 0))),
      }));
    }
    if (initial?.description || initial?.taxValue) {
      const q = initial.qty ? Number(initial.qty) : 1;
      const t = Number(initial.taxValue || 0);
      return [
        {
          id: "item-1",
          description: initial.description || "",
          hsnCode: initial.hsnCode || "4802",
          quantity: q,
          unit: initial.qtyUnit || "PCS",
          rate: q > 0 ? Number((t / q).toFixed(2)) : t,
          amount: t,
        },
      ];
    }
    return [
      {
        id: "item-1",
        description: "",
        hsnCode: "4802",
        quantity: 1,
        unit: "PCS",
        rate: "",
        amount: 0,
      },
    ];
  });

  // Tax and GST Configuration
  const [taxType, setTaxType] = useState(initial?.taxType || "INTRA_STATE");
  const [gstRate, setGstRate] = useState(
    initial ? (Number(initial.cgstRate) + Number(initial.sgstRate) + Number(initial.igstRate)).toString() : "18"
  );
  const [customRoundOff, setCustomRoundOff] = useState(initial?.roundOff ?? "");
  const [manualTaxValue, setManualTaxValue] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Debounced search for suppliers / parties
  useEffect(() => {
    if (!partyName.trim() || partyName.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(`/api/admin/purchases/parties?query=${encodeURIComponent(partyName.trim())}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data.suggestions)) {
          setSuggestions(json.data.suggestions);
        }
      } catch (err) {
        console.error("Failed to fetch party suggestions", err);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [partyName]);

  // Click outside to close suggestion dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (suggestionContainerRef.current && !suggestionContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSuggestion = (sug: PartySuggestion) => {
    setPartyName(sug.name);
    if (sug.gstin) {
      setPartyGstin(sug.gstin);
    }
    setShowSuggestions(false);
  };

  // Item management functions
  const handleAddItem = () => {
    const lastItem = items[items.length - 1];
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length + 1}`,
        description: "",
        hsnCode: lastItem?.hsnCode || "4802",
        quantity: 1,
        unit: lastItem?.unit || "PCS",
        rate: "",
        amount: 0,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleItemChange = (id: string, field: keyof PurchaseItem, val: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: val };

        if (field === "quantity" || field === "rate") {
          const q = Number(field === "quantity" ? val : item.quantity) || 0;
          const r = Number(field === "rate" ? val : item.rate) || 0;
          updated.amount = Number((q * r).toFixed(2));
        }

        return updated;
      })
    );
  };

  const handleItemAmountChange = (id: string, newAmt: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const amt = Number(newAmt) || 0;
        const q = Number(item.quantity) || 0;
        return {
          ...item,
          amount: amt,
          rate: q > 0 ? Number((amt / q).toFixed(2)) : item.rate,
        };
      })
    );
  };

  // Computations
  const computedItemsTaxValue = items.reduce((sum, it) => sum + Number(it.amount || 0), 0);
  const totalTaxValue = manualTaxValue !== null && manualTaxValue !== "" ? Number(manualTaxValue) : Number(computedItemsTaxValue.toFixed(2));
  const totalQuantity = items.reduce((sum, it) => sum + Number(it.quantity || 0), 0);

  const parsedGstRate = Number(gstRate) || 0;
  const isIntra = taxType === "INTRA_STATE";
  const isInter = taxType === "INTER_STATE";
  const cgstRate = isIntra ? parsedGstRate / 2 : 0;
  const sgstRate = isIntra ? parsedGstRate / 2 : 0;
  const igstRate = isInter ? parsedGstRate : 0;
  const cgstAmount = Number(((totalTaxValue * cgstRate) / 100).toFixed(2));
  const sgstAmount = Number(((totalTaxValue * sgstRate) / 100).toFixed(2));
  const igstAmount = Number(((totalTaxValue * igstRate) / 100).toFixed(2));
  const rawTotal = totalTaxValue + cgstAmount + sgstAmount + igstAmount;
  const computedRoundOff = customRoundOff !== "" ? Number(customRoundOff) : Number((Math.round(rawTotal) - rawTotal).toFixed(2));
  const totalValue = Number((rawTotal + computedRoundOff).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!partyName.trim()) {
      setError("Please enter party name");
      return;
    }
    if (!billNo.trim()) {
      setError("Please enter bill number");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        date,
        partyName: partyName.trim(),
        partyGstin: partyGstin.trim().toUpperCase() || null,
        billNo: billNo.trim(),
        items: items.map((it) => ({
          id: it.id,
          description: it.description.trim(),
          hsnCode: it.hsnCode.trim(),
          quantity: Number(it.quantity) || 1,
          unit: it.unit,
          rate: Number(it.rate) || 0,
          amount: Number(it.amount) || 0,
        })),
        hsnCode: items[0]?.hsnCode?.trim() || "4802",
        description: items.map((i) => i.description.trim()).filter(Boolean).join(", ") || null,
        qty: totalQuantity > 0 ? totalQuantity : null,
        qtyUnit: items[0]?.unit || "PCS",
        taxValue: totalTaxValue,
        taxType,
        cgstRate,
        sgstRate,
        igstRate,
        roundOff: computedRoundOff,
        notes: notes.trim() || null,
      };

      const url = isEdit ? `/api/admin/purchases/${initial!.id}` : "/api/admin/purchases";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error?.message || "Failed to save purchase bill");
        return;
      }
      router.push("/admin/purchases");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full rounded-lg border border-[#d7dce5] bg-[#f9fafb] px-3 py-2 text-sm text-[#162237] placeholder-[#a0aec0] focus:border-[#7B3F8D] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#7B3F8D]";
  const labelCls = "block mb-1 text-xs font-semibold text-[#607089] uppercase tracking-wide";

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/purchases"
          className="rounded-lg border border-[#d7dce5] p-2 text-[#607089] hover:bg-[#f5f7fa] transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#162237]">
            {isEdit ? "Edit Purchase Bill" : "Add Purchase Entry"}
          </h1>
          <p className="text-sm text-[#607089]">
            Log supplier purchases with multiple items and GST calculation
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Party & Bill Information */}
        <div className="rounded-xl border border-[#d7dce5] bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#f0f2f5] pb-3">
            <h2 className="text-sm font-bold text-[#7B3F8D] uppercase tracking-wider">
              Supplier / Party Information
            </h2>
            <span className="text-xs text-[#607089]">Autocomplete enabled</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Bill Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Purchase Bill / Invoice # *</label>
              <input
                type="text"
                required
                placeholder="e.g. INV-2026-431"
                value={billNo}
                onChange={(e) => setBillNo(e.target.value)}
                className={`${inputCls} font-mono font-semibold`}
              />
            </div>

            {/* Party Name with Autocomplete Suggestions */}
            <div className="relative" ref={suggestionContainerRef}>
              <label className={labelCls}>Party / Supplier Name *</label>
              <input
                type="text"
                required
                placeholder="Type to search supplier or customer..."
                value={partyName}
                onChange={(e) => {
                  setPartyName(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                className={inputCls}
                autoComplete="off"
              />

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-lg border border-[#c9d2df] bg-white shadow-lg">
                  <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Matching Suppliers &amp; Parties ({suggestions.length})</span>
                    {loadingSuggestions && <span>Searching...</span>}
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {suggestions.map((sug, idx) => (
                      <li
                        key={idx}
                        onClick={() => handleSelectSuggestion(sug)}
                        className="px-3 py-2.5 hover:bg-purple-50/70 cursor-pointer flex items-center justify-between transition-colors text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5 font-bold text-[#162237]">
                            {sug.source === "SUPPLIER" ? (
                              <Building size={13} className="text-[#7B3F8D] shrink-0" />
                            ) : (
                              <User size={13} className="text-blue-600 shrink-0" />
                            )}
                            <span className="truncate">{sug.name}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                            {sug.gstin ? <span className="font-mono text-slate-700">GST: {sug.gstin}</span> : <span>No GST</span>}
                            {sug.phone ? <span>· {sug.phone}</span> : null}
                            {sug.city ? <span>· {sug.city}</span> : null}
                          </div>
                        </div>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold shrink-0 border ${
                            sug.source === "SUPPLIER"
                              ? "bg-purple-50 text-[#7B3F8D] border-purple-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {sug.source === "SUPPLIER" ? "Previous Supplier" : "Customer"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <label className={labelCls}>Party GSTIN</label>
              <input
                type="text"
                placeholder="e.g. 24AIOPA4327J2ZC"
                maxLength={15}
                value={partyGstin}
                onChange={(e) => setPartyGstin(e.target.value.toUpperCase())}
                className={`${inputCls} font-mono tracking-wider`}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Multiple Items Table */}
        <div className="rounded-xl border border-[#d7dce5] bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#f0f2f5] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#7B3F8D] uppercase tracking-wider">
                Purchase Items ({items.length})
              </h2>
              <p className="text-xs text-[#607089]">Add multiple products, paper materials, or consumables</p>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 border border-purple-200 px-3 py-1.5 text-xs font-bold text-[#7B3F8D] hover:bg-purple-100 transition-colors shadow-2xs"
            >
              <Plus size={14} /> Add Item Row
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#e1e6ee]">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#f8fafc] border-b border-[#e1e6ee] text-[#52647e]">
                <tr>
                  <th className="px-2.5 py-2 w-8 text-center font-bold">#</th>
                  <th className="px-3 py-2 font-bold uppercase tracking-wider min-w-[200px]">Item / Description *</th>
                  <th className="px-2.5 py-2 font-bold uppercase tracking-wider w-24">HSN Code</th>
                  <th className="px-2.5 py-2 font-bold uppercase tracking-wider w-20 text-right">Qty *</th>
                  <th className="px-2.5 py-2 font-bold uppercase tracking-wider w-24">Unit</th>
                  <th className="px-2.5 py-2 font-bold uppercase tracking-wider w-24 text-right">Rate (₹)</th>
                  <th className="px-3 py-2 font-bold uppercase tracking-wider w-28 text-right">Amount (₹) *</th>
                  <th className="px-2 py-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8ecf2]">
                {items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="px-2.5 py-2 text-center text-slate-400 font-bold">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        required
                        placeholder="e.g. Art Paper 350 GSM 25x36"
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                        className="w-full rounded border border-[#d7dce5] bg-white px-2 py-1 text-xs text-[#162237] focus:border-[#7B3F8D] focus:outline-hidden"
                      />
                    </td>
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        placeholder="4802"
                        value={item.hsnCode}
                        onChange={(e) => handleItemChange(item.id, "hsnCode", e.target.value)}
                        className="w-full rounded border border-[#d7dce5] bg-white px-2 py-1 text-xs font-mono text-[#162237] focus:border-[#7B3F8D] focus:outline-hidden"
                      />
                    </td>
                    <td className="px-2.5 py-2">
                      <input
                        type="number"
                        required
                        step="0.01"
                        min="0"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, "quantity", e.target.value)}
                        className="w-full rounded border border-[#d7dce5] bg-white px-2 py-1 text-xs text-right font-mono font-semibold text-[#162237] focus:border-[#7B3F8D] focus:outline-hidden"
                      />
                    </td>
                    <td className="px-2.5 py-2">
                      <select
                        value={item.unit}
                        onChange={(e) => handleItemChange(item.id, "unit", e.target.value)}
                        className="w-full rounded border border-[#d7dce5] bg-white px-1.5 py-1 text-xs text-[#162237] focus:border-[#7B3F8D] focus:outline-hidden"
                      >
                        {UNIT_OPTIONS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2.5 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={item.rate}
                        onChange={(e) => handleItemChange(item.id, "rate", e.target.value)}
                        className="w-full rounded border border-[#d7dce5] bg-white px-2 py-1 text-xs text-right font-mono text-[#162237] focus:border-[#7B3F8D] focus:outline-hidden"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        required
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={item.amount || ""}
                        onChange={(e) => handleItemAmountChange(item.id, e.target.value)}
                        className="w-full rounded border border-purple-200 bg-purple-50/30 px-2 py-1 text-xs text-right font-mono font-bold text-[#162237] focus:border-[#7B3F8D] focus:outline-hidden"
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        disabled={items.length <= 1}
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                        title="Delete item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-[#e1e6ee] bg-[#f8fafc] text-xs font-bold text-[#162237]">
                <tr>
                  <td colSpan={3} className="px-3 py-2.5">
                    Total: {items.length} item{items.length > 1 ? "s" : ""}
                  </td>
                  <td className="px-2.5 py-2.5 text-right font-mono">
                    {totalQuantity > 0 ? totalQuantity.toLocaleString("en-IN") : "-"}
                  </td>
                  <td colSpan={2} className="px-2.5 py-2.5 text-right text-slate-500 uppercase">
                    Taxable Subtotal
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-sm text-[#7B3F8D]">
                    ₹ {computedItemsTaxValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[#7B3F8D] px-3.5 py-1.5 text-xs font-bold text-[#7B3F8D] hover:bg-purple-50 transition-colors"
            >
              <Plus size={14} /> Add Another Item
            </button>
            <span className="text-xs text-slate-500">
              Taxable Value automatically calculated from item amounts
            </span>
          </div>
        </div>

        {/* Section 3: GST & Final Amount Calculation */}
        <div className="rounded-xl border border-[#d7dce5] bg-white p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-[#7B3F8D] uppercase tracking-wider">
            GST &amp; Invoice Calculation
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Taxable Value (₹) *</label>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                value={totalTaxValue}
                onChange={(e) => setManualTaxValue(e.target.value)}
                className={`${inputCls} font-mono font-bold`}
              />
            </div>
            <div>
              <label className={labelCls}>GST Rate %</label>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(e.target.value)}
                className={inputCls}
              >
                {["0", "5", "12", "18", "28"].map((r) => (
                  <option key={r} value={r}>
                    {r}%
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Tax Type</label>
              <select
                value={taxType}
                onChange={(e) => setTaxType(e.target.value)}
                className={inputCls}
              >
                <option value="INTRA_STATE">Intra-State (CGST + SGST)</option>
                <option value="INTER_STATE">Inter-State (IGST)</option>
                <option value="EXEMPT">Exempt (0% Tax)</option>
              </select>
            </div>
          </div>

          {/* Computed Tax Breakdown Card */}
          <div className="rounded-xl bg-[#faf5fb] border border-[#e8d5f0] p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {isIntra && (
              <>
                <div className="rounded-lg bg-white/80 p-2 border border-purple-100">
                  <p className="text-[11px] font-bold text-[#607089]">CGST ({cgstRate}%)</p>
                  <p className="font-mono text-sm font-bold text-[#162237] mt-0.5">
                    ₹ {cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-lg bg-white/80 p-2 border border-purple-100">
                  <p className="text-[11px] font-bold text-[#607089]">SGST ({sgstRate}%)</p>
                  <p className="font-mono text-sm font-bold text-[#162237] mt-0.5">
                    ₹ {sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </>
            )}
            {isInter && (
              <div className="col-span-2 rounded-lg bg-white/80 p-2 border border-purple-100">
                <p className="text-[11px] font-bold text-[#607089]">IGST ({igstRate}%)</p>
                <p className="font-mono text-sm font-bold text-[#162237] mt-0.5">
                  ₹ {igstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}
            <div className="rounded-lg bg-white/80 p-2 border border-purple-100">
              <p className="text-[11px] font-bold text-[#607089]">Round Off</p>
              <input
                type="number"
                step="0.01"
                value={customRoundOff !== "" ? customRoundOff : computedRoundOff}
                onChange={(e) => setCustomRoundOff(e.target.value)}
                className="w-full rounded border border-[#d7dce5] bg-white px-2 py-0.5 text-xs font-mono text-[#162237] focus:outline-hidden focus:border-[#7B3F8D] mt-0.5"
              />
            </div>
            <div className="rounded-lg bg-purple-100/70 p-2 border border-purple-200">
              <p className="text-[11px] font-bold text-[#7B3F8D] uppercase tracking-wider">Total Value (₹)</p>
              <p className="font-mono text-base font-bold text-[#7B3F8D] mt-0.5">
                ₹ {totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div>
            <label className={labelCls}>Internal Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid via Cheque #4321 / Raw Material for Wedding Season"
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/purchases"
            className="rounded-lg border border-[#d7dce5] bg-white px-5 py-2.5 text-sm font-semibold text-[#607089] hover:bg-[#f5f7fa] transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#7B3F8D] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#6a3479] disabled:opacity-60 transition-colors shadow-xs"
          >
            <Save size={16} /> {saving ? "Saving..." : isEdit ? "Update Purchase Entry" : "Save Purchase Entry"}
          </button>
        </div>
      </form>
    </div>
  );
}