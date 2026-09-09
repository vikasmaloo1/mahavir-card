"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Check, Edit3, Eye, Printer, RefreshCw, X } from "lucide-react";

import { adminRequest } from "@/lib/admin-client";
import { TaxInvoiceDocument } from "@/components/tax-invoice-document";
import { determinePageSize } from "@/lib/invoice-helper";
import { numberToIndianWords } from "@/lib/number-to-words";
import type { InvoiceData, InvoiceLineItem, InvoiceSizeMode } from "@/lib/invoice-types";

function formatNum(val: number | string | undefined | null): string {
  const n = Number(val || 0);
  return n.toFixed(2);
}

export function AdminInvoiceManagerModal({
  orderId,
  onClose,
}: {
  orderId: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "settings">("preview");

  // Form states for live invoice management
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [challanNumber, setChallanNumber] = useState("");
  const [challanDate, setChallanDate] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [terms, setTerms] = useState("Immediate");
  const [sizeMode, setSizeMode] = useState<InvoiceSizeMode>("AUTO");

  // GST & Tax states
  const [taxScheme, setTaxScheme] = useState<"INTRA_STATE" | "INTER_STATE" | "EXEMPT">("INTRA_STATE");
  const [cgstRate, setCgstRate] = useState<number>(9);
  const [sgstRate, setSgstRate] = useState<number>(9);
  const [igstRate, setIgstRate] = useState<number>(18);
  const [sellerGstin, setSellerGstin] = useState("24AIUPJ2271L1ZV");
  const [buyerGstin, setBuyerGstin] = useState("");
  const [roundOff, setRoundOff] = useState<number>(0);

  // Customer details
  const [customerName, setCustomerName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [phone, setPhone] = useState("");

  // Items
  const [items, setItems] = useState<InvoiceLineItem[]>([]);

  // Bank
  const [bankName, setBankName] = useState("BANK OF BARODA");
  const [accountNumber, setAccountNumber] = useState("03280200003947");
  const [ifscCode, setIfscCode] = useState("BARB0GANAHM");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await adminRequest<InvoiceData>(`/api/admin/orders/${orderId}/invoice`);
      setInvoice(res);

      setInvoiceNumber(res.invoiceNumber);
      setInvoiceDate(res.invoiceDate);
      setChallanNumber(res.challanNumber);
      setChallanDate(res.challanDate);
      setOrderNumber(res.orderNumber || "");
      setOrderDate(res.orderDate);
      setTerms(res.terms);
      setSizeMode(res.sizeMode || "AUTO");

      setTaxScheme(res.taxType || "INTRA_STATE");
      setCgstRate(res.cgstRate);
      setSgstRate(res.sgstRate);
      setIgstRate(res.igstRate);
      setSellerGstin(res.sellerGstin);
      setBuyerGstin(res.customer.gstin || "");
      setRoundOff(res.roundOff || 0);

      setCustomerName(res.customer.name);
      setAddressLine1(res.customer.addressLine1 || "");
      setAddressLine2(res.customer.addressLine2 || "");
      setPhone(res.customer.phone || "");

      setItems(res.items);
      setBankName(res.bank.bankName);
      setAccountNumber(res.bank.accountNumber);
      setIfscCode(res.bank.ifscCode);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load invoice");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live recalculation
  const liveInvoiceData: InvoiceData | null = useMemo(() => {
    if (!invoice) return null;

    const subtotal = items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);

    const isIntra = taxScheme === "INTRA_STATE";
    const isInter = taxScheme === "INTER_STATE";

    const effCgstRate = isIntra ? cgstRate : 0;
    const effSgstRate = isIntra ? sgstRate : 0;
    const effIgstRate = isInter ? igstRate : 0;

    const cgstAmount = Number(((subtotal * effCgstRate) / 100).toFixed(2));
    const sgstAmount = Number(((subtotal * effSgstRate) / 100).toFixed(2));
    const igstAmount = Number(((subtotal * effIgstRate) / 100).toFixed(2));

    const totalTaxes = cgstAmount + sgstAmount + igstAmount;
    const rawTotal = subtotal + totalTaxes + invoice.deliveryCharge;
    const grandTotal = Number((rawTotal + Number(roundOff || 0)).toFixed(2));
    const amountInWords = numberToIndianWords(grandTotal);

    const resolvedPageSize = determinePageSize(items.length, sizeMode);

    return {
      ...invoice,
      orderNumber: orderNumber || invoice.orderNumber,
      invoiceNumber,
      invoiceDate,
      challanNumber,
      challanDate,
      orderDate,
      terms,
      sellerGstin,
      sizeMode,
      resolvedPageSize,
      customer: {
        ...invoice.customer,
        name: customerName,
        addressLine1,
        addressLine2,
        phone,
        gstin: buyerGstin,
      },
      items,
      taxType: taxScheme,
      cgstRate: effCgstRate,
      cgstAmount,
      sgstRate: effSgstRate,
      sgstAmount,
      igstRate: effIgstRate,
      igstAmount,
      subtotal: Number(subtotal.toFixed(2)),
      roundOff: Number(roundOff || 0),
      grandTotal,
      amountInWords,
      bank: {
        ...invoice.bank,
        bankName,
        accountNumber,
        ifscCode,
      },
    };
  }, [
    invoice,
    items,
    sizeMode,
    orderNumber,
    invoiceNumber,
    invoiceDate,
    challanNumber,
    challanDate,
    orderDate,
    terms,
    taxScheme,
    cgstRate,
    sgstRate,
    igstRate,
    sellerGstin,
    buyerGstin,
    roundOff,
    customerName,
    addressLine1,
    addressLine2,
    phone,
    bankName,
    accountNumber,
    ifscCode,
  ]);

  function handlePrint() {
    window.print();
  }

  async function handleSave() {
    if (!liveInvoiceData) return;
    setSaving(true);
    setNotice("");
    setError("");
    try {
      await adminRequest(`/api/admin/orders/${orderId}/invoice`, {
        method: "POST",
        body: JSON.stringify({
          overrides: {
            orderNumber,
            invoiceNumber,
            invoiceDate,
            challanNumber,
            challanDate,
            orderDate,
            terms,
            sizeMode,
            taxType: taxScheme,
            cgstRate,
            sgstRate,
            igstRate,
            sellerGstin,
            roundOff,
            customer: {
              name: customerName,
              addressLine1,
              addressLine2,
              phone,
              gstin: buyerGstin,
            },
            customItems: items,
            bank: {
              bankName,
              accountNumber,
              ifscCode,
            },
          },
        }),
      });
      setNotice("Invoice settings saved successfully and document updated.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to save invoice settings");
    } finally {
      setSaving(false);
    }
  }

  function updateItem(index: number, patch: Partial<InvoiceLineItem>) {
    setItems((curr) => {
      const next = [...curr];
      const updated = { ...next[index], ...patch };
      if (patch.quantity !== undefined || patch.rate !== undefined) {
        updated.amount = Number(((Number(updated.quantity) || 0) * (Number(updated.rate) || 0)).toFixed(2));
      }
      next[index] = updated;
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 overflow-y-auto">
      {/* Print Page Styles injected dynamically */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #tax-invoice-print-area, #tax-invoice-print-area * {
            visibility: visible !important;
          }
          #tax-invoice-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page {
            size: ${liveInvoiceData?.resolvedPageSize === "A5" ? "A5 portrait" : "A4 portrait"};
            margin: ${liveInvoiceData?.resolvedPageSize === "A5" ? "4mm" : "6mm"};
          }
        }
      `}</style>

      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-xl bg-white shadow-2xl overflow-hidden print:max-h-none print:shadow-none print:w-auto">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3.5 bg-slate-50 print:hidden">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-[#162237]">
              Tax Invoice Desk · Order {invoice?.orderNumber}
            </h2>
            {liveInvoiceData ? (
              <span
                className={`rounded px-2.5 py-0.5 text-xs font-bold ${
                  liveInvoiceData.resolvedPageSize === "A5"
                    ? "bg-purple-100 text-purple-800 border border-purple-200"
                    : "bg-blue-100 text-blue-800 border border-blue-200"
                }`}
              >
                Page Size: {liveInvoiceData.resolvedPageSize} ({liveInvoiceData.resolvedPageSize === "A5" ? "Half-Sheet" : "Full-Sheet"})
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switchers on small viewports */}
            <div className="flex items-center border border-[#cfd7e3] rounded bg-white p-0.5 text-xs font-semibold sm:hidden">
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`px-2.5 py-1 rounded ${activeTab === "preview" ? "bg-[#2457b8] text-white font-bold" : "text-slate-600"}`}
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className={`px-2.5 py-1 rounded ${activeTab === "settings" ? "bg-[#2457b8] text-white font-bold" : "text-slate-600"}`}
              >
                Settings
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !liveInvoiceData}
              className="inline-flex items-center gap-1.5 rounded bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 shadow-xs"
            >
              <Printer size={15} /> Print Invoice
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading || !liveInvoiceData}
              className="inline-flex items-center gap-1.5 rounded bg-[#2457b8] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#1a4497] shadow-xs disabled:opacity-50"
            >
              <Check size={15} /> {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-700 rounded"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {notice ? (
          <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-200 text-xs font-semibold text-emerald-800 print:hidden">
            {notice}
          </div>
        ) : null}
        {error ? (
          <div className="bg-red-50 px-4 py-2 border-b border-red-200 text-xs font-semibold text-red-800 print:hidden">
            {error}
          </div>
        ) : null}

        {/* Content Body */}
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-[#2457b8]" />
            Loading invoice details...
          </div>
        ) : liveInvoiceData ? (
          <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-[26rem_minmax(0,1fr)] divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
            {/* Controls Sidebar */}
            <div
              className={`p-4 space-y-5 bg-slate-50/50 overflow-y-auto max-h-[80vh] print:hidden ${
                activeTab === "preview" ? "hidden sm:block" : "block"
              }`}
            >
              {/* Page Sizing Segmented Control */}
              <div className="rounded-lg border border-[#c9d2df] bg-white p-3 space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#2457b8]">
                  Invoice Print Size Mode
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setSizeMode("AUTO")}
                    className={`py-1.5 px-2 rounded text-center transition-colors ${
                      sizeMode === "AUTO"
                        ? "bg-[#2457b8] text-white font-bold shadow-xs"
                        : "text-slate-700 hover:bg-white/60"
                    }`}
                  >
                    Auto ({items.length <= 4 ? "A5" : "A4"})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSizeMode("HALF")}
                    className={`py-1.5 px-2 rounded text-center transition-colors ${
                      sizeMode === "HALF"
                        ? "bg-[#2457b8] text-white font-bold shadow-xs"
                        : "text-slate-700 hover:bg-white/60"
                    }`}
                  >
                    Half (A5)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSizeMode("A4")}
                    className={`py-1.5 px-2 rounded text-center transition-colors ${
                      sizeMode === "A4"
                        ? "bg-[#2457b8] text-white font-bold shadow-xs"
                        : "text-slate-700 hover:bg-white/60"
                    }`}
                  >
                    Full (A4)
                  </button>
                </div>
                <p className="text-[11px] text-gray-500">
                  {sizeMode === "AUTO"
                    ? `Auto-selected ${liveInvoiceData.resolvedPageSize} because order has ${items.length} line item(s).`
                    : sizeMode === "HALF"
                    ? "Locked to A5 (Half of A4: 148mm × 210mm) for compact paper saving."
                    : "Locked to full A4 (210mm × 297mm) sheet."}
                </p>
              </div>

              {/* Invoice Numbers & Dates */}
              <div className="rounded-lg border border-[#c9d2df] bg-white p-3 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#2457b8]">
                  Invoice & Challan Details
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-gray-700">Invoice No. *</label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="mt-1 w-full rounded border border-[#c9d2df] px-2 py-1.5 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700">Invoice Date (DD-MM-YYYY)</label>
                    <input
                      type="text"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="mt-1 w-full rounded border border-[#c9d2df] px-2 py-1.5 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700">Challan No.</label>
                    <input
                      type="text"
                      value={challanNumber}
                      onChange={(e) => setChallanNumber(e.target.value)}
                      className="mt-1 w-full rounded border border-[#c9d2df] px-2 py-1.5 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700">Challan Date</label>
                    <input
                      type="text"
                      value={challanDate}
                      onChange={(e) => setChallanDate(e.target.value)}
                      className="mt-1 w-full rounded border border-[#c9d2df] px-2 py-1.5 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700">Order No. (Short)</label>
                    <input
                      type="text"
                      placeholder="e.g. 50 or F6014071"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      className="mt-1 w-full rounded border border-[#c9d2df] px-2 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700">Order Date</label>
                    <input
                      type="text"
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                      className="mt-1 w-full rounded border border-[#c9d2df] px-2 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700">Terms</label>
                    <input
                      type="text"
                      value={terms}
                      onChange={(e) => setTerms(e.target.value)}
                      className="mt-1 w-full rounded border border-[#c9d2df] px-2 py-1.5"
                    />
                  </div>
                </div>
              </div>

              {/* GST & Tax Settings */}
              <div className="rounded-lg border border-[#c9d2df] bg-white p-3 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#2457b8]">
                  GST & Tax Rates Management
                </h4>
                <div className="space-y-2.5 text-xs">
                  <div>
                    <label className="block font-semibold text-gray-700">GST Jurisdiction</label>
                    <select
                      value={taxScheme}
                      onChange={(e) => setTaxScheme(e.target.value as any)}
                      className="mt-1 w-full rounded border border-[#c9d2df] px-2 py-1.5 font-medium"
                    >
                      <option value="INTRA_STATE">Gujarat Intra-State (CGST 9% + SGST 9%)</option>
                      <option value="INTER_STATE">Inter-State Out-of-Gujarat (IGST 18%)</option>
                      <option value="EXEMPT">Exempt / Non-GST (0%)</option>
                    </select>
                  </div>

                  {taxScheme === "INTRA_STATE" ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-gray-700">CGST Rate (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={cgstRate}
                          onChange={(e) => setCgstRate(Number(e.target.value))}
                          className="mt-1 w-full rounded border border-[#c9d2df] px-2 py-1 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700">SGST Rate (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={sgstRate}
                          onChange={(e) => setSgstRate(Number(e.target.value))}
                          className="mt-1 w-full rounded border border-[#c9d2df] px-2 py-1 font-mono"
                        />
                      </div>
                    </div>
                  ) : taxScheme === "INTER_STATE" ? (
                    <div>
                      <label className="block font-semibold text-gray-700">IGST Rate (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={igstRate}
                        onChange={(e) => setIgstRate(Number(e.target.value))}
                        className="mt-1 w-full rounded border border-[#c9d2df] px-2 py-1 font-mono"
                      />
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-gray-700">Seller GSTIN</label>
                      <input
                        type="text"
                        value={sellerGstin}
                        onChange={(e) => setSellerGstin(e.target.value)}
                        className="mt-1 w-full rounded border border-[#c9d2df] px-2 py-1 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700">Buyer GSTIN</label>
                      <input
                        type="text"
                        placeholder="e.g. 24DAFPS... or blank"
                        value={buyerGstin}
                        onChange={(e) => setBuyerGstin(e.target.value)}
                        className="mt-1 w-full rounded border border-[#c9d2df] px-2 py-1 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700">Round Off Adjustment (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={roundOff}
                      onChange={(e) => setRoundOff(Number(e.target.value))}
                      className="mt-1 w-full rounded border border-[#c9d2df] px-2 py-1 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Customer Info (M/s.) */}
              <div className="rounded-lg border border-[#c9d2df] bg-white p-3 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#2457b8]">
                  Customer Details on Bill (M/s.)
                </h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block font-semibold text-gray-700">Billed To (M/s.) *</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="mt-1 w-full rounded border border-[#c9d2df] px-2 py-1.5 uppercase font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700">Address Line 1</label>
                    <input
                      type="text"
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      className="mt-1 w-full rounded border border-[#c9d2df] px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700">Address Line 2 (City / Pincode)</label>
                    <input
                      type="text"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                      className="mt-1 w-full rounded border border-[#c9d2df] px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700">Mobile No.</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1 w-full rounded border border-[#c9d2df] px-2 py-1 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Line Items HSN and Details */}
              <div className="rounded-lg border border-[#c9d2df] bg-white p-3 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#2457b8]">
                  Item HSN Codes & Rates ({items.length})
                </h4>
                <div className="space-y-3 text-xs">
                  {items.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded border border-gray-200 bg-slate-50/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">Item #{idx + 1}</span>
                        <span className="font-mono font-bold text-[#2457b8]">
                          ₹{formatNum(item.amount)}
                        </span>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600">Description</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(idx, { description: e.target.value })}
                          className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 font-bold text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-600">HSN Code</label>
                          <input
                            type="text"
                            value={item.hsnCode}
                            onChange={(e) => updateItem(idx, { hsnCode: e.target.value })}
                            className="mt-0.5 w-full rounded border border-gray-300 px-1.5 py-1 font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-600">Qty</label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                            className="mt-0.5 w-full rounded border border-gray-300 px-1.5 py-1 font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-600">Rate (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) => updateItem(idx, { rate: Number(e.target.value) })}
                            className="mt-0.5 w-full rounded border border-gray-300 px-1.5 py-1 font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-600">Unit</label>
                          <input
                            type="text"
                            value={item.per}
                            onChange={(e) => updateItem(idx, { per: e.target.value })}
                            className="mt-0.5 w-full rounded border border-gray-300 px-1.5 py-1 text-xs uppercase"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Document Preview Panel */}
            <div
              className={`p-4 sm:p-6 bg-slate-200/70 overflow-y-auto flex justify-center items-start print:p-0 print:bg-white ${
                activeTab === "settings" ? "hidden sm:flex" : "flex"
              }`}
            >
              <div id="tax-invoice-print-area">
                <TaxInvoiceDocument data={liveInvoiceData} variant="admin" />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}