"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Building,
  Check,
  Eye,
  Layers,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { adminRequest } from "@/lib/admin-client";
import { TaxInvoiceDocument } from "@/components/tax-invoice-document";
import { defaultHsnForDescription } from "@/lib/invoice-helper";
import { numberToIndianWords } from "@/lib/number-to-words";
import { printInvoiceDocument } from "@/lib/print-invoice";
import type { InvoiceData } from "@/lib/invoice-types";

interface BillItemType {
  id: string;
  name: string;
  hsnCode: string;
  defaultRate: string | null;
  defaultPer: string;
  sortOrder: number;
}

interface ItemRow {
  id: string;
  itemType: string;
  description: string;
  hsnCode: string;
  quantity: number;
  rate: number;
  per: string;
  amount: number;
}

interface CustomerOption {
  id: string;
  contactName: string;
  companyName: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  stateCode?: string | null;
  gstNumber?: string | null;
  customerType?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
}

function formatNum(val: number | string | undefined | null): string {
  const n = Number(val || 0);
  return n.toFixed(2);
}

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateDisplay(yyyyMmDd: string): string {
  if (!yyyyMmDd) return "";
  const parts = yyyyMmDd.split("-");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return yyyyMmDd;
}

export function AdminManualBillModal({
  onClose,
  onBillCreated,
  editBillId,
}: {
  onClose: () => void;
  onBillCreated?: () => void;
  editBillId?: string | null;
}) {
  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [letterPadMode, setLetterPadMode] = useState(false);

  // Incremental numbers & date
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [chalanNumber, setChalanNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(getTodayString());
  const [chalanDate, setChalanDate] = useState(getTodayString());
  const [terms, setTerms] = useState("Immediate");
  const [status, setStatus] = useState<"PAID" | "UNPAID" | "PARTIAL">("PAID");
  const [notes, setNotes] = useState("");

  // Customer state & picker dialog
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [allCustomers, setAllCustomers] = useState<CustomerOption[]>([]);
  const [customerTypeFilter, setCustomerTypeFilter] = useState<"ALL" | "B2C" | "B2B">("ALL");
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("Ahmedabad");
  const [state, setState] = useState("Gujarat");
  const [stateCode, setStateCode] = useState("GJ");
  const [postalCode, setPostalCode] = useState("");
  const [gstin, setGstin] = useState("");
  const [saveAsNewCustomer, setSaveAsNewCustomer] = useState(true);

  // Item Types & HSN Master Options
  const [itemTypes, setItemTypes] = useState<BillItemType[]>([]);
  const [hsnOptions, setHsnOptions] = useState<Array<{ code: string; description: string; gstRate: string }>>([]);
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeHsn, setNewTypeHsn] = useState("4909");
  const [newTypePer, setNewTypePer] = useState("PCS.");
  const [newTypeRate, setNewTypeRate] = useState("0");
  const [savingNewType, setSavingNewType] = useState(false);

  // Items
  const [items, setItems] = useState<ItemRow[]>([
    {
      id: "item-1",
      itemType: "Card & Premium Card",
      description: "VISITING CARDS (CARD & PREMIUM CARD)",
      hsnCode: "4909",
      quantity: 1000,
      rate: 0.5,
      per: "PCS.",
      amount: 500,
    },
  ]);

  // Tax and totals
  const [taxType, setTaxType] = useState<"INTRA_STATE" | "INTER_STATE" | "EXEMPT">("INTRA_STATE");
  const [cgstRate, setCgstRate] = useState<number>(9);
  const [sgstRate, setSgstRate] = useState<number>(9);
  const [igstRate, setIgstRate] = useState<number>(18);
  const [deliveryCharge, setDeliveryCharge] = useState<number>(0);
  const [customRoundOff, setCustomRoundOff] = useState<number | null>(null);

  async function loadCustomers(queryStr: string = "") {
    setLoadingCustomers(true);
    try {
      const params = new URLSearchParams();
      if (queryStr.trim()) params.set("query", queryStr.trim());
      params.set("limit", "100");
      const res = await adminRequest<any>(`/api/admin/customers?${params.toString()}`);
      const list = res?.items || res?.customers || [];
      setAllCustomers(list);
    } catch (err: any) {
      console.error("Failed to load customers:", err);
    } finally {
      setLoadingCustomers(false);
    }
  }

  // Fetch item types, HSN codes, next sequential numbers and pre-load customers on mount
  useEffect(() => {
    async function init() {
      try {
        const [typesRes, billsRes, hsnRes] = await Promise.all([
          adminRequest<{ types: BillItemType[] }>("/api/admin/bills/types"),
          !editBillId
            ? adminRequest<{ nextNumbers?: { nextInvoiceNumber: string; nextChalanNumber: string } }>("/api/admin/bills?limit=1")
            : Promise.resolve(null),
          adminRequest<{ hsnList: Array<{ code: string; description: string; gstRate: string }> }>("/api/admin/bills/hsn"),
        ]);

        if (typesRes?.types) {
          setItemTypes(typesRes.types);
        }

        if (hsnRes?.hsnList) {
          setHsnOptions(hsnRes.hsnList);
          if (hsnRes.hsnList.length > 0 && !newTypeHsn) {
            setNewTypeHsn(hsnRes.hsnList[0].code);
          }
        }

        if (billsRes?.nextNumbers) {
          setInvoiceNumber(billsRes.nextNumbers.nextInvoiceNumber);
          setChalanNumber(billsRes.nextNumbers.nextChalanNumber);
        }
      } catch (err: any) {
        console.error("Failed to load initial bill data:", err);
      }
      loadCustomers("");
    }
    init();

    if (editBillId) {
      async function loadEditBill() {
        try {
          const res = await adminRequest<{ bill: any }>(`/api/admin/bills/${editBillId}`);
          const b = res?.bill;
          if (b) {
            setInvoiceNumber(b.invoiceNumber || "");
            setChalanNumber(b.chalanNumber || "");
            if (b.invoiceDate) {
              setInvoiceDate(new Date(b.invoiceDate).toISOString().slice(0, 10));
            }
            if (b.chalanDate) {
              setChalanDate(new Date(b.chalanDate).toISOString().slice(0, 10));
            }
            setTerms(b.terms || "Immediate");
            setStatus(b.status || "PAID");
            setNotes(b.notes || "");
            setSelectedCustomerId(b.customerId || null);
            setCustomerName(b.customerName || "");
            setCompanyName(b.companyName || "");
            setPhone(b.phone || "");
            setAddressLine1(b.addressLine1 || "");
            setAddressLine2(b.addressLine2 || "");
            setCity(b.city || "Ahmedabad");
            setState(b.state || "Gujarat");
            setStateCode(b.stateCode || "GJ");
            setPostalCode(b.postalCode || "");
            setGstin(b.gstin || "");
            if (Array.isArray(b.items) && b.items.length > 0) {
              setItems(
                b.items.map((it: any, idx: number) => ({
                  id: it.id || `item-${idx + 1}`,
                  itemType: it.itemType || "",
                  description: it.description || "",
                  hsnCode: it.hsnCode || "4909",
                  quantity: Number(it.quantity || 1),
                  rate: Number(it.rate || 0),
                  per: it.per || "PCS.",
                  amount: Number(it.amount || 0),
                }))
              );
            }
            setTaxType(b.taxType || "INTRA_STATE");
            setCgstRate(Number(b.cgstRate || 9));
            setSgstRate(Number(b.sgstRate || 9));
            setIgstRate(Number(b.igstRate || 18));
            setDeliveryCharge(Number(b.deliveryCharge || 0));
            if (b.roundOff !== undefined && b.roundOff !== null) {
              setCustomRoundOff(Number(b.roundOff));
            }
          }
        } catch (err: any) {
          setError(err.message || "Failed to load bill for editing");
        }
      }
      loadEditBill();
    }
  }, [editBillId]);

  // Search existing customers in picker dialog with debounce
  useEffect(() => {
    if (!showCustomerPicker) return;
    const timer = setTimeout(() => {
      loadCustomers(customerSearchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [customerSearchQuery, showCustomerPicker]);

  const filteredCustomers = useMemo(() => {
    let list = allCustomers;
    if (customerTypeFilter === "B2C") {
      list = list.filter((c) => c.customerType !== "B2B");
    } else if (customerTypeFilter === "B2B") {
      list = list.filter((c) => c.customerType === "B2B");
    }
    return list;
  }, [allCustomers, customerTypeFilter]);

  function handleSelectCustomer(c: CustomerOption) {
    setSelectedCustomerId(c.id);
    setCustomerName(c.contactName || c.companyName || "");
    setCompanyName(c.companyName || "");
    setPhone(c.phone || "");
    setAddressLine1(c.addressLine1 || "");
    setAddressLine2(c.addressLine2 || "");
    setCity(c.city || "Ahmedabad");
    setState(c.state || "Gujarat");
    setStateCode(c.stateCode || "GJ");
    setPostalCode(c.postalCode || "");
    setGstin(c.gstNumber || "");
    setShowCustomerPicker(false);
    setCustomerSearchQuery("");

    // Automatically set tax type based on state
    if (c.stateCode && c.stateCode !== "GJ") {
      setTaxType("INTER_STATE");
    } else {
      setTaxType("INTRA_STATE");
    }
  }

  function handleClearCustomer() {
    setSelectedCustomerId(null);
    setCustomerName("");
    setCompanyName("");
    setPhone("");
    setAddressLine1("");
    setAddressLine2("");
    setCity("Ahmedabad");
    setState("Gujarat");
    setStateCode("GJ");
    setPostalCode("");
    setGstin("");
    setTaxType("INTRA_STATE");
  }

  // Handle adding new item row
  function handleAddItem() {
    const nextIdx = items.length + 1;
    const defaultType = itemTypes[0];
    setItems([
      ...items,
      {
        id: `item-${Date.now()}-${nextIdx}`,
        itemType: defaultType ? defaultType.name : "Custom Item",
        description: defaultType ? defaultType.name.toUpperCase() : "PRINTING WORK",
        hsnCode: defaultType ? defaultType.hsnCode : "4909",
        quantity: 1,
        rate: defaultType?.defaultRate ? Number(defaultType.defaultRate) : 0,
        per: defaultType ? defaultType.defaultPer : "PCS.",
        amount: defaultType?.defaultRate ? Number(defaultType.defaultRate) : 0,
      },
    ]);
  }

  function handleRemoveItem(idx: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  }

  function handleItemChange(idx: number, field: keyof ItemRow, value: any) {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[idx], [field]: value };

      if (field === "itemType") {
        const foundType = itemTypes.find((t) => t.name === value);
        if (foundType) {
          item.description = foundType.name.toUpperCase();
          item.hsnCode = foundType.hsnCode;
          item.per = foundType.defaultPer;
          if (foundType.defaultRate && Number(foundType.defaultRate) > 0) {
            item.rate = Number(foundType.defaultRate);
          }
        }
      }

      if (field === "quantity" || field === "rate") {
        const q = field === "quantity" ? Number(value) : item.quantity;
        const r = field === "rate" ? Number(value) : item.rate;
        item.amount = Number((q * r).toFixed(2));
      }

      if (field === "description" && !item.hsnCode) {
        item.hsnCode = defaultHsnForDescription(String(value));
      }

      updated[idx] = item;
      return updated;
    });
  }

  // Save new custom type via API
  async function handleCreateNewType(e: React.FormEvent) {
    e.preventDefault();
    if (!newTypeName.trim()) return;

    setSavingNewType(true);
    try {
      const res = await adminRequest<{ type: BillItemType }>("/api/admin/bills/types", {
        method: "POST",
        body: JSON.stringify({
          name: newTypeName.trim(),
          hsnCode: newTypeHsn.trim() || "4909",
          defaultPer: newTypePer.trim() || "PCS.",
          defaultRate: newTypeRate || "0",
        }),
      });

      if (res?.type) {
        setItemTypes((prev) => [...prev, res.type]);
        // Also update current item row if desired
        if (items.length > 0) {
          handleItemChange(items.length - 1, "itemType", res.type.name);
        }
      }
      setShowAddTypeModal(false);
      setNewTypeName("");
      setNewTypeRate("0");
    } catch (err: any) {
      alert(err.message || "Failed to save item type");
    } finally {
      setSavingNewType(false);
    }
  }

  // Financial calculations
  const subtotal = useMemo(() => {
    return items.reduce((acc, it) => acc + Number(it.amount || 0), 0);
  }, [items]);

  const { effectiveCgstRate, effectiveSgstRate, effectiveIgstRate, cgstAmount, sgstAmount, igstAmount, totalTaxes } = useMemo(() => {
    let cg = 0;
    let sg = 0;
    let ig = 0;

    if (taxType === "INTRA_STATE") {
      cg = cgstRate;
      sg = sgstRate;
      ig = 0;
    } else if (taxType === "INTER_STATE") {
      cg = 0;
      sg = 0;
      ig = igstRate;
    }

    const cgAmt = Number(((subtotal * cg) / 100).toFixed(2));
    const sgAmt = Number(((subtotal * sg) / 100).toFixed(2));
    const igAmt = Number(((subtotal * ig) / 100).toFixed(2));
    return {
      effectiveCgstRate: cg,
      effectiveSgstRate: sg,
      effectiveIgstRate: ig,
      cgstAmount: cgAmt,
      sgstAmount: sgAmt,
      igstAmount: igAmt,
      totalTaxes: cgAmt + sgAmt + igAmt,
    };
  }, [subtotal, taxType, cgstRate, sgstRate, igstRate]);

  const rawTotal = subtotal + totalTaxes + Number(deliveryCharge || 0);

  const autoRoundOff = useMemo(() => {
    return Number((Math.round(rawTotal) - rawTotal).toFixed(2));
  }, [rawTotal]);

  const roundOff = customRoundOff !== null ? customRoundOff : autoRoundOff;
  const grandTotal = Number((rawTotal + roundOff).toFixed(2));
  const amountInWords = useMemo(() => numberToIndianWords(grandTotal), [grandTotal]);

  // Construct live InvoiceData for preview / printing
  const invoicePreviewData: InvoiceData = useMemo(() => {
    return {
      orderId: "manual-bill",
      orderNumber: chalanNumber || invoiceNumber,
      invoiceNumber: invoiceNumber || "DRAFT",
      invoiceDate: formatDateDisplay(invoiceDate),
      challanNumber: chalanNumber || undefined,
      challanDate: formatDateDisplay(chalanDate || invoiceDate),
      orderDate: formatDateDisplay(invoiceDate),
      terms: terms || "Immediate",
      sellerGstin: "24AIUPJ2271L1ZV",
      customer: {
        name: customerName || "Walk-In Customer",
        companyName: companyName || undefined,
        addressLine1: addressLine1 || undefined,
        addressLine2: addressLine2 || undefined,
        city: city || "Ahmedabad",
        state: state || "Gujarat",
        postalCode: postalCode || undefined,
        phone: phone || undefined,
        gstin: gstin || undefined,
        customerType: "B2C",
      },
      items: items.map((it, idx) => ({
        id: it.id || `item-${idx + 1}`,
        description: it.description || "PRINTING WORK",
        hsnCode: it.hsnCode || "4909",
        quantity: it.quantity,
        rate: it.rate,
        per: it.per || "PCS.",
        amount: it.amount,
      })),
      taxType,
      cgstRate: effectiveCgstRate,
      cgstAmount,
      sgstRate: effectiveSgstRate,
      sgstAmount,
      igstRate: effectiveIgstRate,
      igstAmount,
      subtotal: Number(subtotal.toFixed(2)),
      deliveryCharge: Number(deliveryCharge || 0),
      roundOff,
      grandTotal,
      amountInWords,
      bank: {
        bankName: "BANK OF BARODA",
        accountNumber: "03280200003947",
        ifscCode: "BARB0GANAHM",
        beneficiaryName: "MAHAVIR CARD",
        upiId: "mahavircard2011-2@oksbi",
        qrImageUrl: "/images/qr/b2c-qr.jpg",
      },
      sizeMode: "AUTO",
      resolvedPageSize: "A4",
    };
  }, [
    invoiceNumber,
    chalanNumber,
    invoiceDate,
    chalanDate,
    terms,
    customerName,
    companyName,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    phone,
    gstin,
    items,
    taxType,
    effectiveCgstRate,
    effectiveSgstRate,
    effectiveIgstRate,
    cgstAmount,
    sgstAmount,
    igstAmount,
    subtotal,
    deliveryCharge,
    roundOff,
    grandTotal,
    amountInWords,
  ]);

  async function handleSubmit(shouldPrint: boolean = false) {
    if (!customerName.trim()) {
      setError("Please enter customer name");
      return;
    }
    if (items.length === 0) {
      setError("Please add at least one line item");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        invoiceNumber: invoiceNumber.trim() || undefined,
        chalanNumber: chalanNumber.trim() || undefined,
        invoiceDate,
        chalanDate,
        terms,
        status,
        notes,

        customerId: selectedCustomerId,
        saveAsNewCustomer,
        customerName: customerName.trim(),
        companyName: companyName.trim() || undefined,
        phone: phone.trim() || undefined,
        addressLine1: addressLine1.trim() || undefined,
        addressLine2: addressLine2.trim() || undefined,
        city: city.trim() || "Ahmedabad",
        state: state.trim() || "Gujarat",
        stateCode: stateCode.trim() || "GJ",
        postalCode: postalCode.trim() || undefined,
        gstin: gstin.trim() || undefined,

        items: items.map((it) => ({
          itemType: it.itemType,
          description: it.description,
          hsnCode: it.hsnCode,
          quantity: it.quantity,
          rate: it.rate,
          per: it.per,
          amount: it.amount,
        })),

        taxType,
        cgstRate: effectiveCgstRate,
        sgstRate: effectiveSgstRate,
        igstRate: effectiveIgstRate,
        deliveryCharge,
        roundOff,
      };

      if (editBillId) {
        await adminRequest<{ bill: any }>(`/api/admin/bills/${editBillId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await adminRequest<{ bill: any }>("/api/admin/bills", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      if (shouldPrint) {
        // Switch to preview tab and print
        setActiveTab("preview");
        setTimeout(() => {
          printInvoiceDocument("manual-bill-preview-area", {
            pageSize: "A4",
            letterPadMode,
          });
        }, 300);
      }

      if (onBillCreated) onBillCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save bill");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[96vh] my-auto overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                {editBillId ? `Edit Bill: ${invoiceNumber || "..."}` : "Manual Tax Bill & Chalan Generator"}
              </h2>
              <p className="text-xs text-slate-400">
                {editBillId
                  ? "Update invoice details, line items, customer, and tax calculations"
                  : "Generate incremental bills with custom HSN, tax %, and customer details"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="bg-slate-800 p-0.5 rounded-lg flex text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("form")}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === "form" ? "bg-blue-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
                }`}
              >
                Bill Form
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  activeTab === "preview" ? "bg-blue-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Live Invoice Preview
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Notice */}
        {error ? (
          <div className="mx-5 mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-red-500 hover:text-red-700 font-bold">✕</button>
          </div>
        ) : null}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {activeTab === "preview" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-100 p-3 rounded-lg border border-slate-200 text-xs">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={letterPadMode}
                      onChange={(e) => setLetterPadMode(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    Letter Pad Stationery Mode (hides header for pre-printed letterhead)
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => printInvoiceDocument("manual-bill-preview-area", { pageSize: "A4", letterPadMode })}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Print Current Preview
                </button>
              </div>

              <div className="border border-slate-300 rounded-lg p-2 bg-slate-50 flex justify-center">
                <div id="manual-bill-preview-area" className="w-full max-w-[210mm] bg-white shadow-md">
                  <TaxInvoiceDocument data={invoicePreviewData} letterPadMode={letterPadMode} />
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(false); }} className="space-y-5">
              {/* Top Row: Sequential Invoice No, Chalan No, Dates */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Invoice No. <span className="text-blue-600">(Incremental)</span>
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. MVC/26-27/00001"
                    className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Chalan No. <span className="text-emerald-600">(Incremental)</span>
                  </label>
                  <input
                    type="text"
                    value={chalanNumber}
                    onChange={(e) => setChalanNumber(e.target.value)}
                    placeholder="e.g. CH-0001"
                    className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Chalan Date
                  </label>
                  <input
                    type="date"
                    value={chalanDate}
                    onChange={(e) => setChalanDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Customer Section: Select existing OR create new */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Customer Information
                    </span>
                    {selectedCustomerId ? (
                      <span className="px-2 py-0.5 text-[10px] bg-blue-100 text-blue-800 rounded-full font-semibold">
                        Existing Customer
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-800 rounded-full font-semibold">
                        Manual / Walk-In
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedCustomerId ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomerPicker(true);
                            loadCustomers(customerSearchQuery);
                          }}
                          className="px-2.5 py-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md font-semibold flex items-center gap-1 border border-blue-200"
                        >
                          <Search className="w-3.5 h-3.5" />
                          Change Customer
                        </button>
                        <button
                          type="button"
                          onClick={handleClearCustomer}
                          className="px-2 py-1 text-xs text-slate-500 hover:text-red-600 font-medium"
                        >
                          Clear Selection
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomerPicker(true);
                          loadCustomers(customerSearchQuery);
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
                      >
                        <Users className="w-3.5 h-3.5" />
                        Select Existing Customer (B2B & B2C)
                      </button>
                    )}
                  </div>
                </div>

                {/* Selected Customer Highlight Card */}
                {selectedCustomerId ? (
                  <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">
                          {customerName}
                        </span>
                        {companyName && companyName !== customerName ? (
                          <span className="text-xs text-slate-600 font-medium">({companyName})</span>
                        ) : null}
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800 uppercase">
                          Selected
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 mt-1">
                        {phone ? <span>Mo: <strong>{phone}</strong></span> : null}
                        <span>City: <strong>{city}</strong>, {stateCode}</span>
                        {gstin ? <span className="font-mono">GSTIN: <strong>{gstin}</strong></span> : null}
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Customer Details Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Ramesh Patel"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Patel Enterprise"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 9825098250"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Address (Line 1 & 2)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={addressLine1}
                        onChange={(e) => setAddressLine1(e.target.value)}
                        placeholder="Shop / Building, Road"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={addressLine2}
                        onChange={(e) => setAddressLine2(e.target.value)}
                        placeholder="Area / Landmark"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      GSTIN (Optional)
                    </label>
                    <input
                      type="text"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      placeholder="e.g. 24AAAAA0000A1Z5"
                      className="w-full px-2.5 py-1.5 text-xs uppercase bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      State & Code
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                      />
                      <input
                        type="text"
                        value={stateCode}
                        onChange={(e) => {
                          const code = e.target.value.toUpperCase();
                          setStateCode(code);
                          if (code && code !== "GJ") {
                            setTaxType("INTER_STATE");
                          } else {
                            setTaxType("INTRA_STATE");
                          }
                        }}
                        placeholder="GJ"
                        className="w-full px-2.5 py-1.5 text-xs uppercase bg-white border border-slate-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div className="flex items-center pt-5">
                    {!selectedCustomerId ? (
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-blue-700 select-none">
                        <input
                          type="checkbox"
                          checked={saveAsNewCustomer}
                          onChange={(e) => setSaveAsNewCustomer(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <UserPlus className="w-3.5 h-3.5" /> Save as customer in system
                      </label>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Items Section: Line items with Type, HSN, Qty, Rate, Per, Amount */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Line Items & HSN Codes
                    </span>
                    <span className="text-[11px] text-slate-500">
                      (Cards: 4909, Papers: 4802, Stickers: 4821, Books: 4820, Synthetic Covers: 4921)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddTypeModal(true)}
                      className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-600" /> Add New Type
                    </button>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="px-2.5 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-md flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Item Row
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs"
                    >
                      {/* Item Type Preset */}
                      <div className="col-span-12 sm:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                          Type
                        </label>
                        <select
                          value={item.itemType}
                          onChange={(e) => handleItemChange(idx, "itemType", e.target.value)}
                          className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded-md font-medium"
                        >
                          <option value="">-- Custom Item --</option>
                          {itemTypes.map((t) => (
                            <option key={t.id} value={t.name}>
                              {t.name} [{t.hsnCode}]
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Description */}
                      <div className="col-span-12 sm:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                          Description
                        </label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                          className="w-full px-2 py-1 text-xs uppercase bg-white border border-slate-300 rounded-md font-semibold"
                          required
                        />
                      </div>

                      {/* HSN Code */}
                      <div className="col-span-4 sm:col-span-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                          HSN
                        </label>
                        <input
                          type="text"
                          list={`hsn-datalist-${idx}`}
                          value={item.hsnCode}
                          onChange={(e) => handleItemChange(idx, "hsnCode", e.target.value)}
                          placeholder="HSN"
                          className="w-full px-1.5 py-1 text-xs text-center bg-white border border-slate-300 rounded-md font-mono font-bold text-blue-700 focus:ring-1 focus:ring-blue-500"
                          required
                        />
                        <datalist id={`hsn-datalist-${idx}`}>
                          {hsnOptions.length > 0 ? (
                            hsnOptions.map((h) => (
                              <option key={h.code} value={h.code}>
                                {h.code} - {h.description}
                              </option>
                            ))
                          ) : (
                            <>
                              <option value="4909">4909 - Card & Premium Card</option>
                              <option value="4802">4802 - Paper & Brochure</option>
                              <option value="4821">4821 - Sticker & Labels</option>
                              <option value="4820">4820 - Books (Diaries, Registers)</option>
                              <option value="4921">4921 - Synthetic Covers</option>
                            </>
                          )}
                        </datalist>
                      </div>

                      {/* Quantity */}
                      <div className="col-span-4 sm:col-span-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                          Qty
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                          className="w-full px-1.5 py-1 text-xs text-center bg-white border border-slate-300 rounded-md font-bold"
                          required
                        />
                      </div>

                      {/* Rate */}
                      <div className="col-span-4 sm:col-span-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                          Rate
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.rate}
                          onChange={(e) => handleItemChange(idx, "rate", e.target.value)}
                          className="w-full px-1.5 py-1 text-xs text-right bg-white border border-slate-300 rounded-md"
                          required
                        />
                      </div>

                      {/* Per Unit */}
                      <div className="col-span-4 sm:col-span-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                          Per
                        </label>
                        <select
                          value={item.per}
                          onChange={(e) => handleItemChange(idx, "per", e.target.value)}
                          className="w-full px-1 py-1 text-xs text-center uppercase bg-white border border-slate-300 rounded-md"
                        >
                          <option value="PCS.">PCS.</option>
                          <option value="SHEET">SHEET</option>
                          <option value="BOX">BOX</option>
                          <option value="PKT">PKT</option>
                          <option value="SET">SET</option>
                          <option value="KG">KG</option>
                        </select>
                      </div>

                      {/* Amount */}
                      <div className="col-span-6 sm:col-span-1 text-right">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                          Amount
                        </label>
                        <span className="block py-1 font-bold text-slate-900 text-xs tabular-nums">
                          ₹{formatNum(item.amount)}
                        </span>
                      </div>

                      {/* Delete */}
                      <div className="col-span-2 sm:col-span-1 flex justify-end pt-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={items.length <= 1}
                          className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick HSN Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-[11px]">
                  <span className="text-slate-500 font-semibold flex items-center gap-1">
                    <Tag className="w-3 h-3 text-blue-600" />
                    Quick HSN:
                  </span>
                  {[
                    { code: "4909", label: "Cards (4909)" },
                    { code: "4802", label: "Papers (4802)" },
                    { code: "4821", label: "Stickers (4821)" },
                    { code: "4820", label: "Books (4820)" },
                    { code: "4921", label: "Synthetic Covers (4921)" },
                  ].map((preset) => (
                    <button
                      key={preset.code}
                      type="button"
                      onClick={() => {
                        if (items.length > 0) {
                          handleItemChange(items.length - 1, "hsnCode", preset.code);
                        }
                      }}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200 rounded text-slate-700 font-medium transition-colors"
                      title={`Apply HSN ${preset.code} to last row`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Taxes, Charges, Terms & Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Tax Scheme & Terms */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs">
                  <span className="block font-bold uppercase tracking-wider text-slate-700 text-[11px] border-b border-slate-100 pb-1">
                    GST Scheme & Terms
                  </span>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Tax Scheme
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setTaxType("INTRA_STATE")}
                        className={`py-1.5 px-2 rounded-md font-semibold border text-center transition-all ${
                          taxType === "INTRA_STATE"
                            ? "bg-blue-50 border-blue-500 text-blue-700"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Intra-State (CGST+SGST)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaxType("INTER_STATE")}
                        className={`py-1.5 px-2 rounded-md font-semibold border text-center transition-all ${
                          taxType === "INTER_STATE"
                            ? "bg-blue-50 border-blue-500 text-blue-700"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Inter-State (IGST)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaxType("EXEMPT")}
                        className={`py-1.5 px-2 rounded-md font-semibold border text-center transition-all ${
                          taxType === "EXEMPT"
                            ? "bg-blue-50 border-blue-500 text-blue-700"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Exempt / Nil
                      </button>
                    </div>
                  </div>

                  {taxType === "INTRA_STATE" ? (
                    <div className="grid grid-cols-2 gap-3 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">
                          CGST Rate %
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={cgstRate}
                          onChange={(e) => setCgstRate(Number(e.target.value))}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded-md font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">
                          SGST Rate %
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={sgstRate}
                          onChange={(e) => setSgstRate(Number(e.target.value))}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded-md font-semibold"
                        />
                      </div>
                    </div>
                  ) : taxType === "INTER_STATE" ? (
                    <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                      <label className="block font-semibold text-slate-600 mb-1">
                        IGST Rate %
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={igstRate}
                        onChange={(e) => setIgstRate(Number(e.target.value))}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded-md font-semibold"
                      />
                    </div>
                  ) : (
                    <div className="p-2 text-slate-500 bg-slate-50 rounded-md">
                      GST will not be added to this invoice.
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">
                        Payment Terms
                      </label>
                      <input
                        type="text"
                        value={terms}
                        onChange={(e) => setTerms(e.target.value)}
                        placeholder="e.g. Immediate"
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">
                        Bill Status
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as any)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded-md font-semibold"
                      >
                        <option value="PAID">PAID</option>
                        <option value="UNPAID">UNPAID</option>
                        <option value="PARTIAL">PARTIAL</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Internal Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Notes for records..."
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded-md text-xs"
                    />
                  </div>
                </div>

                {/* Right: Calculations & Totals */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                  <span className="block font-bold uppercase tracking-wider text-slate-700 text-[11px] border-b border-slate-200 pb-1">
                    Bill Summary
                  </span>

                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">Subtotal:</span>
                    <span className="font-bold tabular-nums">₹{formatNum(subtotal)}</span>
                  </div>

                  {taxType === "INTRA_STATE" ? (
                    <>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-600">CGST ({effectiveCgstRate}%):</span>
                        <span className="font-semibold tabular-nums">₹{formatNum(cgstAmount)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200">
                        <span className="text-slate-600">SGST ({effectiveSgstRate}%):</span>
                        <span className="font-semibold tabular-nums">₹{formatNum(sgstAmount)}</span>
                      </div>
                    </>
                  ) : taxType === "INTER_STATE" ? (
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-600">IGST ({effectiveIgstRate}%):</span>
                      <span className="font-semibold tabular-nums">₹{formatNum(igstAmount)}</span>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">Delivery / Shipping:</span>
                    <div className="flex items-center gap-1 w-28">
                      <span>₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={deliveryCharge}
                        onChange={(e) => setDeliveryCharge(Number(e.target.value))}
                        className="w-full px-1.5 py-0.5 text-right bg-white border border-slate-300 rounded-sm font-semibold"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">Round Off:</span>
                    <div className="flex items-center gap-1 w-28">
                      <span>₹</span>
                      <input
                        type="number"
                        step="0.01"
                        value={roundOff}
                        onChange={(e) => setCustomRoundOff(Number(e.target.value))}
                        className="w-full px-1.5 py-0.5 text-right bg-white border border-slate-300 rounded-sm font-semibold"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between py-2 border-t-2 border-slate-800 text-sm font-black text-slate-900">
                    <span>GRAND TOTAL:</span>
                    <span className="text-base text-blue-700 tabular-nums">₹{formatNum(grandTotal)}</span>
                  </div>

                  <div className="bg-white p-2 rounded-md border border-slate-200 text-[11px] text-slate-600 leading-snug">
                    <span className="font-bold text-slate-700 uppercase block mb-0.5">Amount in Words:</span>
                    {amountInWords}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSubmit(true)}
                    disabled={saving}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                  >
                    <Printer className="w-4 h-4 text-slate-300" />
                    {editBillId ? "Update & Print Invoice" : "Save & Print Invoice"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSubmit(false)}
                    disabled={saving}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                  >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {editBillId ? "Update Bill" : "Save Bill"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Inline Modal: Add New Item Type */}
      {showAddTypeModal ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-5 border border-slate-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="font-bold text-slate-900 text-sm">Add New Bill Item Type</h3>
              <button onClick={() => setShowAddTypeModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateNewType} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Type Name * (e.g. Brochure Single Fold, Vinyl Sticker)
                </label>
                <input
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="Enter item type name"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  HSN Code *
                </label>
                <div className="flex gap-2">
                  <select
                    value={newTypeHsn}
                    onChange={(e) => setNewTypeHsn(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white font-medium"
                  >
                    {hsnOptions.length > 0 ? (
                      hsnOptions.map((h) => (
                        <option key={h.code} value={h.code}>
                          {h.code} ({h.description})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="4909">4909 (Card & Premium Card)</option>
                        <option value="4802">4802 (Paper, Cover & Art Card Brochure)</option>
                        <option value="4821">4821 (Sticker & Labels)</option>
                        <option value="4820">4820 (Books - Registers, Diaries, Notebooks)</option>
                        <option value="4921">4921 (Synthetic Covers)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Default Unit (Per)
                  </label>
                  <input
                    type="text"
                    value={newTypePer}
                    onChange={(e) => setNewTypePer(e.target.value.toUpperCase())}
                    placeholder="PCS."
                    className="w-full px-2.5 py-1.5 uppercase border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Default Rate
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newTypeRate}
                    onChange={(e) => setNewTypeRate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddTypeModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-md font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNewType}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold disabled:opacity-50"
                >
                  {savingNewType ? "Saving..." : "Save Type"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Customer Picker Dialog Modal */}
      {showCustomerPicker && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[85vh] border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="font-bold text-sm">Select Customer (B2B & B2C)</h3>
                  <p className="text-xs text-slate-400">Search by name, company, phone, city or GSTIN</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomerPicker(false)}
                className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search and Tabs */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  placeholder="Type to search: e.g. Mahavir, company, phone, GSTIN..."
                  className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden font-medium"
                  autoFocus
                />
                {customerSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerSearchQuery("");
                      loadCustomers("");
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Segment filter buttons */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setCustomerTypeFilter("ALL")}
                    className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                      customerTypeFilter === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All ({allCustomers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerTypeFilter("B2C")}
                    className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                      customerTypeFilter === "B2C" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    B2C Retail ({allCustomers.filter((c) => c.customerType !== "B2B").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerTypeFilter("B2B")}
                    className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                      customerTypeFilter === "B2B" ? "bg-white text-purple-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    B2B Wholesale ({allCustomers.filter((c) => c.customerType === "B2B").length})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleClearCustomer();
                    setShowCustomerPicker(false);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  + Enter New / Manual
                </button>
              </div>
            </div>

            {/* Customer List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[420px]">
              {loadingCustomers ? (
                <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                  <span>Loading customers...</span>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  <p className="font-semibold text-slate-700">No customers found</p>
                  <p className="text-[11px] text-slate-400 mt-1">Try a different search query or click "Enter New / Manual" above</p>
                </div>
              ) : (
                filteredCustomers.map((c) => {
                  const isB2B = c.customerType === "B2B";
                  const isSelected = selectedCustomerId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCustomer(c)}
                      className={`w-full text-left p-3.5 hover:bg-blue-50/50 transition-colors flex items-center justify-between gap-3 ${
                        isSelected ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {c.contactName || c.companyName || "Unnamed"}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-bold rounded-sm uppercase ${
                              isB2B
                                ? "bg-purple-100 text-purple-800 border border-purple-200"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            }`}
                          >
                            {isB2B ? "B2B" : "B2C"}
                          </span>
                          {c.companyName && c.companyName !== c.contactName && (
                            <span className="text-xs text-slate-500 font-medium truncate">
                              ({c.companyName})
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
                          {c.phone && <span>📞 {c.phone}</span>}
                          {c.city && <span>📍 {c.city}{c.state ? `, ${c.state}` : ""}</span>}
                          {c.gstNumber && <span className="font-mono font-semibold text-slate-700">GST: {c.gstNumber}</span>}
                        </div>
                      </div>

                      <span className="shrink-0 px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 hover:border-blue-400 text-blue-700 rounded-md shadow-2xs">
                        {isSelected ? "Selected" : "Select"}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Dialog Footer */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Showing {filteredCustomers.length} customer(s)</span>
              <button
                type="button"
                onClick={() => setShowCustomerPicker(false)}
                className="px-3 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-md font-medium text-xs shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
