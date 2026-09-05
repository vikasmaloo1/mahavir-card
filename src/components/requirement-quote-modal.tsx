"use client";

import { CheckCircle2, FileText, Loader2, Send, Sparkles, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

export type RequirementContext = {
  mode?: "SEARCH_FALLBACK" | "STATE_UNAVAILABLE" | "CUSTOM_REQUEST";
  title?: string;
  subtitle?: string;
  productName?: string;
  category?: string;
  searchQuery?: string;
  quantity?: number;
  size?: string;
  gsm?: string;
  finish?: string;
  customerState?: string;
  additionalNotes?: string;
};

export function RequirementQuoteModal({
  isOpen,
  onClose,
  context = {},
}: {
  isOpen: boolean;
  onClose: () => void;
  context?: RequirementContext;
}) {
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState(1000);
  const [size, setSize] = useState("");
  const [gsm, setGsm] = useState("");
  const [finish, setFinish] = useState("");
  const [deliveryState, setDeliveryState] = useState("");
  const [notes, setNotes] = useState("");

  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Populate context whenever modal opens or context changes
  useEffect(() => {
    if (!isOpen) return;

    setProductName(context.productName || context.searchQuery || "");
    setQuantity(context.quantity && context.quantity > 0 ? context.quantity : 1000);
    setSize(context.size || "");
    setGsm(context.gsm || "");
    setFinish(context.finish || "");
    setDeliveryState(context.customerState || "");
    setNotes(context.additionalNotes || "");
    setSubmittedId(null);
    setError("");

    // Fetch user profile if logged in to pre-fill contact details
    fetch("/api/account/profile")
      .then((res) => res.json())
      .then((payload) => {
        if (payload?.success && payload.data) {
          const profile = payload.data;
          if (profile.contactName) setContactName(profile.contactName);
          if (profile.email) setEmail(profile.email);
          if (profile.phone) setPhone(profile.phone);
          if (profile.companyName) setCompanyName(profile.companyName);
          if (!context.customerState && profile.stateCode) {
            setDeliveryState(profile.stateCode);
          }
        }
      })
      .catch(() => undefined);
  }, [isOpen, context]);

  if (!isOpen) return null;

  const isStateUnavailable = context.mode === "STATE_UNAVAILABLE";
  const heading =
    context.title ||
    (isStateUnavailable ? "Not available in your state?" : "Can't find what you're looking for?");
  const subtext =
    context.subtitle ||
    (isStateUnavailable
      ? "We may still be able to arrange dispatch for your location. Send us your requirement and we'll check."
      : "Tell us what you need and we'll help you with the best possible quotation.");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const summaryMsg = [
        `Requirement: ${productName || "Custom printing request"}`,
        `Quantity: ${quantity}`,
        size ? `Size: ${size}` : null,
        gsm ? `Paper/GSM: ${gsm}` : null,
        finish ? `Finishing: ${finish}` : null,
        deliveryState ? `Delivery State: ${deliveryState}` : null,
        context.searchQuery ? `Original Search Query: "${context.searchQuery}"` : null,
        notes ? `Additional Details: ${notes}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactName: contactName.trim() || "Valued Customer",
          email: email.trim() || "customer@mahavircard.in",
          phone: phone.trim() || undefined,
          companyName: companyName.trim() || undefined,
          subject: `Quote Request: ${productName || "Custom requirement"}`,
          message: summaryMsg,
          source: context.mode || "SEARCH_FALLBACK",
          requirement: {
            searchQuery: context.searchQuery,
            productName,
            category: context.category,
            quantity,
            size,
            gsm,
            finish,
            deliveryState,
            customerNotes: notes,
          },
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error?.message ?? "Could not send your requirement. Please try again.");
      }

      setSubmittedId(payload.data.id ? payload.data.id.slice(0, 8).toUpperCase() : "RECEIVED");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please retry.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 grid size-9 place-items-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          aria-label="Close quote modal"
        >
          <X size={18} />
        </button>

        {submittedId ? (
          /* Success Screen */
          <div className="py-6 text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="mt-4 text-2xl font-bold text-slate-900">Requirement Received!</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Thank you. Our Ahmedabad production & sales team will review your specifications and get back with the best wholesale quotation.
            </p>
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs font-mono text-slate-600">
              Reference: <strong className="text-slate-900">REQ-{submittedId}</strong>
            </div>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-[#1e3a5f] px-6 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-[#152a45] transition-colors"
              >
                Back to Catalogue
              </button>
            </div>
          </div>
        ) : (
          /* Form Screen */
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1e3a5f]">
              <Sparkles size={14} />
              <span>Direct Commercial Quotation</span>
            </div>

            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {heading}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              {subtext}
            </p>

            {context.searchQuery ? (
              <div className="mt-3.5 inline-flex items-center gap-2 rounded-lg bg-blue-50/80 px-3 py-1.5 text-xs text-blue-800 border border-blue-200/60">
                <FileText size={13} />
                <span>
                  Context: Searched <strong>&ldquo;{context.searchQuery}&rdquo;</strong>
                </span>
              </div>
            ) : null}

            {error ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-left">
              {/* Product / Requirement */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Product / Requirement <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. 250 GSM Trifold Brochure, 400 GSM Velvet Visiting Cards"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#1e3a5f] focus:bg-white transition-colors"
                />
              </div>

              {/* Quantity + Dimensions in 2 cols */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={50}
                    step={50}
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#1e3a5f] focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Size / Dimensions
                  </label>
                  <input
                    type="text"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    placeholder="e.g. 2x3 in, A4, 90x53 mm"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#1e3a5f] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Material/GSM + Finish in 2 cols */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Paper Material / GSM
                  </label>
                  <input
                    type="text"
                    value={gsm}
                    onChange={(e) => setGsm(e.target.value)}
                    placeholder="e.g. 250 GSM Art Card, 400 GSM Thermal Matt"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#1e3a5f] focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Printing / Finish
                  </label>
                  <input
                    type="text"
                    value={finish}
                    onChange={(e) => setFinish(e.target.value)}
                    placeholder="e.g. Spot UV, Velvet, Both Side Lamination"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#1e3a5f] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Delivery State */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Delivery Destination / State
                </label>
                <input
                  type="text"
                  value={deliveryState}
                  onChange={(e) => setDeliveryState(e.target.value)}
                  placeholder="e.g. Rajasthan, Gujarat (Ahmedabad Counter Pickup)"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#1e3a5f] focus:bg-white transition-colors"
                />
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Additional Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe folding, die-cutting, dispatch timeline, or special requirements..."
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-[#1e3a5f] focus:bg-white transition-colors"
                />
              </div>

              {/* Contact Information */}
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Contact Information
                </p>
                <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Your Name / Business Name"
                    className="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-[#1e3a5f] focus:bg-white transition-colors"
                  />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Mobile / WhatsApp Number"
                    className="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-[#1e3a5f] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1e3a5f] px-6 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-[#152a45] disabled:opacity-50 transition-colors"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                  <span>{submitting ? "Sending..." : "Submit Requirement"}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
