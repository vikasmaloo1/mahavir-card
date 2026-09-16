"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Layers,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Tag,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";

import { adminRequest } from "@/lib/admin-client";
import { AdminManualBillModal } from "@/components/admin-manual-bill-modal";
import { AdminInvoiceManagerModal } from "@/components/admin-invoice-manager-modal";
import { TaxInvoiceDocument } from "@/components/tax-invoice-document";
import { printInvoiceDocument } from "@/lib/print-invoice";
import type { InvoiceData } from "@/lib/invoice-types";

interface StoreOrderInvoice {
  id: string;
  orderNumber: string;
  status: string;
  invoiceNumber: string | null;
  invoiceYear: string | null;
  invoiceSequence: number | null;
  invoiceDate: string | null;
  chalanNumber: string | null;
  chalanDate: string | null;
  total: string;
  tax: string;
  taxType: string;
  createdAt: string;
  customer: {
    id: string;
    contactName: string | null;
    companyName: string | null;
    phone: string | null;
    gstNumber: string | null;
    customerType: string | null;
    city: string | null;
    state: string | null;
  } | null;
  items: Array<{
    orderId: string;
    description: string;
    jobName: string | null;
    quantity: number;
    totalPrice: string;
  }>;
}

interface BillItemType {
  id: string;
  name: string;
  hsnCode: string;
  defaultRate: string | null;
  defaultPer: string;
  sortOrder: number;
  isActive: boolean;
}

interface BillSummary {
  id: string;
  invoiceNumber: string;
  invoiceYear: string;
  invoiceSequence: number;
  invoiceDate: string;
  chalanNumber: string | null;
  chalanDate: string | null;
  customerId: string | null;
  customerName: string;
  companyName: string | null;
  phone: string | null;
  gstin: string | null;
  items: Array<{
    description: string;
    hsnCode: string;
    quantity: number;
    rate: number;
    per: string;
    amount: number;
  }>;
  taxType: string;
  cgstRate: string;
  sgstRate: string;
  igstRate: string;
  subtotal: string;
  grandTotal: string;
  status: "PAID" | "UNPAID" | "PARTIAL" | "CANCELLED";
  createdAt: string;
}

function formatNum(val: number | string | undefined | null): string {
  const n = Number(val || 0);
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(isoString: string): string {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return isoString;
  }
}

export function AdminBillsList() {
  // Main Tab: Store Orders Invoices VS Manual Store Bills
  const [activeMainTab, setActiveMainTab] = useState<"store-orders" | "manual-bills">("store-orders");

  // === Store Orders Invoices State ===
  const [storeOrders, setStoreOrders] = useState<StoreOrderInvoice[]>([]);
  const [storeOrdersLoading, setStoreOrdersLoading] = useState(true);
  const [storeOrdersQuery, setStoreOrdersQuery] = useState("");
  const [storeOrdersStatus, setStoreOrdersStatus] = useState("");
  const [storeOrdersCustomerType, setStoreOrdersCustomerType] = useState("");
  const [storeOrdersPage, setStoreOrdersPage] = useState(1);
  const [storeOrdersTotalPages, setStoreOrdersTotalPages] = useState(1);
  const [storeOrdersTotal, setStoreOrdersTotal] = useState(0);

  // === Manual Bills State ===
  const [bills, setBills] = useState<BillSummary[]>([]);
  const [loadingBills, setLoadingBills] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [nextNumbers, setNextNumbers] = useState<{ nextInvoiceNumber: string; nextChalanNumber: string } | null>(null);

  // === Modals & Invoice Preview State ===
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [managingOrderId, setManagingOrderId] = useState<string | null>(null);
  const [viewingBillId, setViewingBillId] = useState<string | null>(null);
  const [viewingInvoiceData, setViewingInvoiceData] = useState<InvoiceData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [letterPadMode, setLetterPadMode] = useState(false);

  // Manage Item Types Modal
  const [showTypesManager, setShowTypesManager] = useState(false);
  const [itemTypes, setItemTypes] = useState<BillItemType[]>([]);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeHsn, setNewTypeHsn] = useState("4909");
  const [newTypePer, setNewTypePer] = useState("PCS.");
  const [newTypeRate, setNewTypeRate] = useState("0");
  const [savingType, setSavingType] = useState(false);

  // Load Store Orders Invoices
  async function loadStoreOrders() {
    setStoreOrdersLoading(true);
    try {
      const params = new URLSearchParams();
      if (storeOrdersQuery.trim()) params.set("query", storeOrdersQuery.trim());
      if (storeOrdersStatus) params.set("status", storeOrdersStatus);
      if (storeOrdersCustomerType) params.set("customerType", storeOrdersCustomerType);
      params.set("page", String(storeOrdersPage));
      params.set("limit", "20");

      const res = await adminRequest<{
        orders: StoreOrderInvoice[];
        pagination: { total: number; page: number; totalPages: number };
      }>(`/api/admin/orders/invoices?${params.toString()}`);

      setStoreOrders(res.orders || []);
      setStoreOrdersTotal(res.pagination?.total || 0);
      setStoreOrdersTotalPages(res.pagination?.totalPages || 1);
    } catch (err: any) {
      console.error("Failed to load store order invoices:", err);
    } finally {
      setStoreOrdersLoading(false);
    }
  }

  // Load Manual Bills
  async function loadBills() {
    setLoadingBills(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("query", searchQuery.trim());
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("limit", "20");

      const res = await adminRequest<{
        bills: BillSummary[];
        pagination: { total: number; page: number; totalPages: number };
        nextNumbers: { nextInvoiceNumber: string; nextChalanNumber: string };
      }>(`/api/admin/bills?${params.toString()}`);

      setBills(res.bills || []);
      setTotalCount(res.pagination?.total || 0);
      setTotalPages(res.pagination?.totalPages || 1);
      if (res.nextNumbers) setNextNumbers(res.nextNumbers);
    } catch (err: any) {
      console.error("Failed to load bills:", err);
    } finally {
      setLoadingBills(false);
    }
  }

  async function loadItemTypes() {
    try {
      const res = await adminRequest<{ types: BillItemType[] }>("/api/admin/bills/types");
      setItemTypes(res.types || []);
    } catch (e) {
      console.error("Failed to load item types:", e);
    }
  }

  // Initial load
  useEffect(() => {
    loadStoreOrders();
    loadBills();
  }, []);

  // Store orders pagination / filters trigger
  useEffect(() => {
    loadStoreOrders();
  }, [storeOrdersPage, storeOrdersStatus, storeOrdersCustomerType]);

  // Debounced store orders search
  useEffect(() => {
    const timer = setTimeout(() => {
      setStoreOrdersPage(1);
      loadStoreOrders();
    }, 300);
    return () => clearTimeout(timer);
  }, [storeOrdersQuery]);

  // Manual bills pagination / filters trigger
  useEffect(() => {
    loadBills();
  }, [page, statusFilter]);

  // Debounced manual bills search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadBills();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // View / Print Manual Bill
  async function handleViewBill(billId: string) {
    setViewingBillId(billId);
    setLoadingPreview(true);
    try {
      const res = await adminRequest<{ invoiceData: InvoiceData }>(`/api/admin/bills/${billId}`);
      setViewingInvoiceData(res.invoiceData);
    } catch (e: any) {
      alert(e.message || "Failed to load invoice preview");
      setViewingBillId(null);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleDirectPrintBill(billId: string) {
    try {
      const res = await adminRequest<{ invoiceData: InvoiceData }>(`/api/admin/bills/${billId}`);
      if (res.invoiceData) {
        setViewingInvoiceData(res.invoiceData);
        setViewingBillId(billId);
        setTimeout(() => {
          printInvoiceDocument("admin-bill-view-print-area", {
            pageSize: "A4",
            letterPadMode: false,
          });
        }, 300);
      }
    } catch (e: any) {
      alert(e.message || "Failed to load invoice for printing");
    }
  }

  // View / Print Store Order Invoice
  async function handleViewStoreInvoice(orderId: string) {
    setViewingBillId(`order-${orderId}`);
    setLoadingPreview(true);
    try {
      const data = await adminRequest<InvoiceData>(`/api/admin/orders/${orderId}/invoice`);
      setViewingInvoiceData(data);
    } catch (e: any) {
      alert(e.message || "Failed to load order invoice preview");
      setViewingBillId(null);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleDirectPrintStoreOrder(orderId: string) {
    try {
      const data = await adminRequest<InvoiceData>(`/api/admin/orders/${orderId}/invoice`);
      if (data) {
        setViewingInvoiceData(data);
        setViewingBillId(`order-${orderId}`);
        setTimeout(() => {
          printInvoiceDocument("admin-bill-view-print-area", {
            pageSize: "A4",
            letterPadMode: false,
          });
        }, 300);
      }
    } catch (e: any) {
      alert(e.message || "Failed to load order invoice for printing");
    }
  }

  async function handleDeleteBill(billId: string, invNo: string) {
    if (!confirm(`Are you sure you want to delete bill ${invNo}? This cannot be undone.`)) return;
    try {
      await adminRequest(`/api/admin/bills/${billId}`, { method: "DELETE" });
      loadBills();
    } catch (e: any) {
      alert(e.message || "Failed to delete bill");
    }
  }

  async function handleStatusChange(billId: string, newStatus: string) {
    try {
      await adminRequest(`/api/admin/bills/${billId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      loadBills();
    } catch (e: any) {
      alert(e.message || "Failed to update status");
    }
  }

  async function handleAddType(e: React.FormEvent) {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    setSavingType(true);
    try {
      await adminRequest("/api/admin/bills/types", {
        method: "POST",
        body: JSON.stringify({
          name: newTypeName.trim(),
          hsnCode: newTypeHsn.trim(),
          defaultPer: newTypePer.trim(),
          defaultRate: newTypeRate,
        }),
      });
      setNewTypeName("");
      setNewTypeRate("0");
      loadItemTypes();
    } catch (err: any) {
      alert(err.message || "Failed to add type");
    } finally {
      setSavingType(false);
    }
  }

  function getStatusBadgeStyle(status: string) {
    const s = status.toUpperCase();
    if (s === "IN_PRODUCTION" || s === "PRODUCTION") {
      return "bg-amber-50 text-amber-800 border-amber-200";
    }
    if (s === "READY_FOR_DISPATCH") {
      return "bg-sky-50 text-sky-800 border-sky-200";
    }
    if (s === "DISPATCHED") {
      return "bg-indigo-50 text-indigo-800 border-indigo-200";
    }
    if (s === "DELIVERED" || s === "COMPLETED") {
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    }
    return "bg-slate-50 text-slate-700 border-slate-200";
  }

  const totalRevenue = bills.reduce((acc, b) => acc + Number(b.grandTotal || 0), 0);

  return (
    <div className="space-y-5">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Bills & Tax Invoices
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View store order invoices (in production & delivered) and generate manual tax bills
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              loadItemTypes();
              setShowTypesManager(true);
            }}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <Tag className="w-3.5 h-3.5 text-slate-500" />
            Item Types & HSN
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Manual Bill
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Store Order Invoices
          </span>
          <span className="text-lg font-black text-slate-900 mt-1 block tabular-nums">
            {storeOrdersTotal}
          </span>
          <span className="text-[10px] text-slate-400">In Production & Delivered</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Manual Store Bills
          </span>
          <span className="text-lg font-black text-blue-600 mt-1 block tabular-nums">
            {totalCount}
          </span>
          <span className="text-[10px] text-slate-400">Incremental counter bills</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Next Manual Invoice No.
          </span>
          <span className="text-sm font-bold text-slate-800 mt-1 block font-mono">
            {nextNumbers?.nextInvoiceNumber || "..."}
          </span>
          <span className="text-[10px] text-slate-400">Auto-incrementing</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Next Manual Chalan No.
          </span>
          <span className="text-sm font-bold text-emerald-700 mt-1 block font-mono">
            {nextNumbers?.nextChalanNumber || "..."}
          </span>
          <span className="text-[10px] text-emerald-600">Auto-incrementing</span>
        </div>
      </div>

      {/* Main Table Tabs Switcher */}
      <div className="border-b border-slate-200 bg-white px-4 pt-2 rounded-t-xl shadow-2xs">
        <div className="flex items-center gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveMainTab("store-orders")}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeMainTab === "store-orders"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Store Orders Invoices</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeMainTab === "store-orders"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {storeOrdersTotal}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab("manual-bills")}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeMainTab === "manual-bills"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Manual Store Bills</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeMainTab === "manual-bills"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {totalCount}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: STORE ORDERS INVOICES TABLE (Production & Delivered) */}
      {/* ========================================================================= */}
      {activeMainTab === "store-orders" && (
        <div className="space-y-3">
          {/* Search & Filter Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={storeOrdersQuery}
                onChange={(e) => setStoreOrdersQuery(e.target.value)}
                placeholder="Search order #, invoice #, customer, GSTIN..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              {/* Customer Type Filter */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                {[
                  { label: "All", val: "" },
                  { label: "B2C", val: "B2C" },
                  { label: "B2B", val: "B2B" },
                ].map((t) => (
                  <button
                    key={t.val}
                    type="button"
                    onClick={() => {
                      setStoreOrdersCustomerType(t.val);
                      setStoreOrdersPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      storeOrdersCustomerType === t.val
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                {[
                  { label: "All Prod/Delivered", val: "" },
                  { label: "In Production", val: "IN_PRODUCTION" },
                  { label: "Ready", val: "READY_FOR_DISPATCH" },
                  { label: "Dispatched", val: "DISPATCHED" },
                  { label: "Delivered", val: "DELIVERED" },
                ].map((tab) => (
                  <button
                    key={tab.val}
                    type="button"
                    onClick={() => {
                      setStoreOrdersStatus(tab.val);
                      setStoreOrdersPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-md transition-colors text-[11px] ${
                      storeOrdersStatus === tab.val
                        ? "bg-white text-blue-700 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={loadStoreOrders}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors ml-1"
                title="Refresh Store Orders"
              >
                <RefreshCw className={`w-4 h-4 ${storeOrdersLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Store Orders Invoices Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Order / Invoice No.</th>
                    <th className="py-3 px-4">Order Date</th>
                    <th className="py-3 px-4">Customer Details</th>
                    <th className="py-3 px-4">Order Items</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Tax & Total</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {storeOrdersLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                        Loading store order invoices...
                      </td>
                    </tr>
                  ) : storeOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No store orders found matching the filter (In Production or Delivered).
                      </td>
                    </tr>
                  ) : (
                    storeOrders.map((order) => {
                      const isB2B = order.customer?.customerType === "B2B";
                      return (
                        <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Order & Invoice No */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 font-mono text-[12px] flex items-center gap-1.5">
                              <span>#{order.orderNumber}</span>
                            </div>
                            {order.invoiceNumber ? (
                              <div className="text-[11px] font-semibold text-blue-700 font-mono mt-0.5 flex items-center gap-1">
                                <span className="text-[9px] bg-blue-50 text-blue-700 px-1 py-0.2 rounded border border-blue-200">
                                  INV
                                </span>
                                {order.invoiceNumber}
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Pending Invoice #
                              </div>
                            )}
                            {order.chalanNumber ? (
                              <div className="text-[10px] font-semibold text-emerald-700 font-mono mt-0.5">
                                CH: {order.chalanNumber}
                              </div>
                            ) : null}
                          </td>

                          {/* Date */}
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            <div className="font-medium">{formatDate(order.invoiceDate || order.createdAt)}</div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(order.createdAt).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </td>

                          {/* Customer Details */}
                          <td className="py-3 px-4 max-w-[220px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 truncate">
                                {order.customer?.contactName || order.customer?.companyName || "Direct Customer"}
                              </span>
                              <span
                                className={`px-1.5 py-0.2 text-[9px] font-bold rounded-sm uppercase ${
                                  isB2B
                                    ? "bg-purple-100 text-purple-800 border border-purple-200"
                                    : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                }`}
                              >
                                {isB2B ? "B2B" : "B2C"}
                              </span>
                            </div>
                            {order.customer?.companyName && order.customer?.companyName !== order.customer?.contactName && (
                              <div className="text-[11px] text-slate-500 truncate">
                                {order.customer.companyName}
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                              {order.customer?.phone && <span>Mo: {order.customer.phone}</span>}
                              {order.customer?.gstNumber && (
                                <span className="font-mono font-medium text-slate-600">
                                  GST: {order.customer.gstNumber}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Items & Job Name */}
                          <td className="py-3 px-4 max-w-[220px]">
                            <div className="font-semibold text-slate-800 text-[11px] truncate">
                              {order.items?.[0]?.jobName || order.items?.[0]?.description || "Printing Item"}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                              <span>Qty: {order.items?.[0]?.quantity || 1}</span>
                              {order.items.length > 1 && (
                                <span className="text-blue-600 font-bold">
                                  +{order.items.length - 1} more items
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase tracking-wider ${getStatusBadgeStyle(
                                order.status
                              )}`}
                            >
                              {order.status.replace(/_/g, " ")}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="font-black text-slate-900 text-sm tabular-nums text-blue-700">
                              ₹{formatNum(order.total)}
                            </div>
                            {Number(order.tax || 0) > 0 && (
                              <div className="text-[10px] text-slate-400">
                                Tax: ₹{formatNum(order.tax)}
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleViewStoreInvoice(order.id)}
                                className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                title="View Tax Invoice"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDirectPrintStoreOrder(order.id)}
                                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                                title="Print Invoice Document"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setManagingOrderId(order.id)}
                                className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                                title="Manage / Edit Invoice Numbers & Tax"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <Link
                                href={`/admin/orders/${order.id}`}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                                title="Open Order Details"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for Store Orders */}
            {storeOrdersTotalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs">
                <span className="text-slate-500">
                  Page {storeOrdersPage} of {storeOrdersTotalPages} ({storeOrdersTotal} total store orders)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={storeOrdersPage <= 1}
                    onClick={() => setStoreOrdersPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 bg-white border border-slate-300 rounded-md text-slate-700 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={storeOrdersPage >= storeOrdersTotalPages}
                    onClick={() => setStoreOrdersPage((p) => Math.min(storeOrdersTotalPages, p + 1))}
                    className="px-2.5 py-1 bg-white border border-slate-300 rounded-md text-slate-700 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MANUAL STORE BILLS TABLE (Counter Bills with Sequential Numbers) */}
      {/* ========================================================================= */}
      {activeMainTab === "manual-bills" && (
        <div className="space-y-3">
          {/* Search & Filters for Manual Bills */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search invoice, chalan, customer, GSTIN..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                {[
                  { label: "All", val: "" },
                  { label: "Paid", val: "PAID" },
                  { label: "Unpaid", val: "UNPAID" },
                  { label: "Partial", val: "PARTIAL" },
                ].map((tab) => (
                  <button
                    key={tab.val}
                    type="button"
                    onClick={() => setStatusFilter(tab.val)}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      statusFilter === tab.val
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={loadBills}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors ml-1"
                title="Refresh Bills"
              >
                <RefreshCw className={`w-4 h-4 ${loadingBills ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Bills Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Invoice / Chalan</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer Details</th>
                    <th className="py-3 px-4">Items & HSN</th>
                    <th className="py-3 px-4 text-right">Tax Details</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingBills ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                        Loading bills...
                      </td>
                    </tr>
                  ) : bills.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No manual bills found. Click <strong>&quot;Create Manual Bill&quot;</strong> above to generate one.
                      </td>
                    </tr>
                  ) : (
                    bills.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Invoice & Chalan No */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 font-mono text-[12px]">
                            {b.invoiceNumber}
                          </div>
                          {b.chalanNumber ? (
                            <div className="text-[11px] font-semibold text-emerald-700 font-mono mt-0.5 flex items-center gap-1">
                              <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1 py-0.2 rounded border border-emerald-200">
                                CHALAN
                              </span>
                              {b.chalanNumber}
                            </div>
                          ) : null}
                        </td>

                        {/* Date */}
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          <div className="font-medium">{formatDate(b.invoiceDate)}</div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(b.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </td>

                        {/* Customer Info */}
                        <td className="py-3 px-4 max-w-[220px]">
                          <div className="font-bold text-slate-900 truncate">
                            {b.customerName}
                          </div>
                          {b.companyName && b.companyName !== b.customerName ? (
                            <div className="text-[11px] text-slate-600 truncate">{b.companyName}</div>
                          ) : null}
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            {b.phone ? <span>Mo: {b.phone}</span> : null}
                            {b.gstin ? <span className="font-mono">{b.gstin}</span> : null}
                          </div>
                        </td>

                        {/* Items & HSN */}
                        <td className="py-3 px-4 max-w-[200px]">
                          <div className="font-semibold text-slate-800 text-[11px] truncate">
                            {b.items?.[0]?.description || "Printing Work"}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-medium">
                              HSN: {b.items?.[0]?.hsnCode || "4909"}
                            </span>
                            {b.items.length > 1 ? (
                              <span className="text-blue-600 font-bold">+{b.items.length - 1} more</span>
                            ) : null}
                          </div>
                        </td>

                        {/* Tax Scheme */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="font-semibold text-slate-700">
                            {b.taxType === "INTRA_STATE"
                              ? `CGST+SGST (${Number(b.cgstRate) + Number(b.sgstRate)}%)`
                              : b.taxType === "INTER_STATE"
                              ? `IGST (${Number(b.igstRate)}%)`
                              : "Exempt (0%)"}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Sub: ₹{formatNum(b.subtotal)}
                          </div>
                        </td>

                        {/* Grand Total */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="font-black text-slate-900 text-sm tabular-nums text-blue-700">
                            ₹{formatNum(b.grandTotal)}
                          </div>
                        </td>

                        {/* Status with Quick Toggle */}
                        <td className="py-3 px-4 text-center">
                          <select
                            value={b.status}
                            onChange={(e) => handleStatusChange(b.id, e.target.value)}
                            className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider border cursor-pointer ${
                              b.status === "PAID"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : b.status === "PARTIAL"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }`}
                          >
                            <option value="PAID">PAID</option>
                            <option value="UNPAID">UNPAID</option>
                            <option value="PARTIAL">PARTIAL</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleViewBill(b.id)}
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="View Tax Invoice"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDirectPrintBill(b.id)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                              title="Print Document"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBill(b.id, b.invoiceNumber)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Delete Bill"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 ? (
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs">
                <span className="text-slate-500">
                  Page {page} of {totalPages} ({totalCount} total bills)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 bg-white border border-slate-300 rounded-md text-slate-700 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 bg-white border border-slate-300 rounded-md text-slate-700 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Manage Order Invoice Modal */}
      {managingOrderId ? (
        <AdminInvoiceManagerModal
          orderId={managingOrderId}
          onClose={() => {
            setManagingOrderId(null);
            loadStoreOrders();
          }}
        />
      ) : null}

      {/* Manual Bill Generator Modal */}
      {showCreateModal ? (
        <AdminManualBillModal
          onClose={() => setShowCreateModal(false)}
          onBillCreated={() => {
            loadBills();
          }}
        />
      ) : null}

      {/* Invoice View & Print Modal */}
      {viewingBillId && viewingInvoiceData ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[94vh] my-auto overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">Tax Invoice: {viewingInvoiceData.invoiceNumber}</h3>
                {viewingInvoiceData.challanNumber ? (
                  <span className="text-xs bg-emerald-700/80 px-2 py-0.5 rounded text-emerald-100 font-mono">
                    Chalan: {viewingInvoiceData.challanNumber}
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={letterPadMode}
                    onChange={(e) => setLetterPadMode(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  Pre-printed Letterhead Mode
                </label>

                <button
                  type="button"
                  onClick={() =>
                    printInvoiceDocument("admin-bill-view-print-area", {
                      pageSize: "A4",
                      letterPadMode,
                    })
                  }
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>

                <button
                  onClick={() => {
                    setViewingBillId(null);
                    setViewingInvoiceData(null);
                  }}
                  className="p-1 text-slate-400 hover:text-white rounded-md"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-100 flex justify-center">
              <div id="admin-bill-view-print-area" className="w-full max-w-[210mm] bg-white shadow-md p-2">
                <TaxInvoiceDocument data={viewingInvoiceData} letterPadMode={letterPadMode} />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Item Types Manager Modal ("listing add new types") */}
      {showTypesManager ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl p-5 border border-slate-300 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-600" />
                  Bill Item Types & HSN Presets
                </h3>
                <p className="text-xs text-slate-500">Preset item types with pre-configured HSN codes for quick billing</p>
              </div>
              <button
                onClick={() => setShowTypesManager(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
              {/* Add New Type Form */}
              <form onSubmit={handleAddType} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
                <span className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">
                  + Add New Item Type
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      placeholder="e.g. Art Card 350 GSM"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white"
                      required
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      HSN Code *
                    </label>
                    <select
                      value={newTypeHsn}
                      onChange={(e) => setNewTypeHsn(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-md bg-white"
                    >
                      <option value="4909">4909 (Card)</option>
                      <option value="4802">4802 (Paper/Brochure)</option>
                      <option value="4821">4821 (Sticker)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Unit (Per)
                    </label>
                    <input
                      type="text"
                      value={newTypePer}
                      onChange={(e) => setNewTypePer(e.target.value.toUpperCase())}
                      placeholder="PCS."
                      className="w-full px-2 py-1.5 uppercase border border-slate-300 rounded-md bg-white"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <button
                      type="submit"
                      disabled={savingType}
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold disabled:opacity-50"
                    >
                      {savingType ? "Adding..." : "+ Add Type"}
                    </button>
                  </div>
                </div>
              </form>

              {/* Existing Types List */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 font-bold text-[10px] text-slate-600 uppercase">
                      <th className="py-2 px-3">Type Name</th>
                      <th className="py-2 px-3 text-center">HSN Code</th>
                      <th className="py-2 px-3 text-center">Default Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itemTypes.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-800">{t.name}</td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-blue-700">{t.hsnCode}</td>
                        <td className="py-2 px-3 text-center font-medium text-slate-600 uppercase">{t.defaultPer}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTypesManager(false)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
