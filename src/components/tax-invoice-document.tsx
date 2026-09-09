"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { MapPin, Phone, Mail } from "lucide-react";

import type { InvoiceData } from "@/lib/invoice-types";
import { shortenOrderNumber } from "@/lib/invoice-helper";

function formatNum(val: number | string | undefined | null): string {
  const n = Number(val || 0);
  return n.toFixed(2);
}

// Italic display wordmark with drop-cap initials, matching the brand logotype on the printed bill book.
function Wordmark() {
  return (
    <h1 className="italic leading-none text-black whitespace-nowrap" style={{ fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif" }}>
      <span className="text-[1.35em] font-extrabold align-baseline">M</span>
      <span className="text-[0.92em] font-bold align-baseline">ahavir</span>
      <span className="text-[1.35em] font-extrabold align-baseline"> C</span>
      <span className="text-[0.92em] font-bold align-baseline">ard</span>
    </h1>
  );
}

export function TaxInvoiceDocument({
  data,
  className = "",
  variant = "customer",
  letterPadMode,
}: {
  data: InvoiceData;
  className?: string;
  /** "admin" prints on pre-printed letterhead: skips the logo/branding graphics and leaves a 35mm blank margin top and bottom for it. */
  variant?: "customer" | "admin";
  /** If true, leaves 35mm blank spacing at top and bottom for pre-printed letter pad stationery. Defaults to true for variant="admin". */
  letterPadMode?: boolean;
}) {
  const isLetterPad = letterPadMode !== undefined ? letterPadMode : variant === "admin";
  const isLetterhead = isLetterPad;
  const isA5 = data.resolvedPageSize === "A5";
  const displayOrderNo = shortenOrderNumber(data.orderNumber);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!data.bank.upiId) { setQrDataUrl(null); return; }
    const uri = `upi://pay?${new URLSearchParams({ pa: data.bank.upiId, pn: data.bank.beneficiaryName || "Mahavir Card", am: String(data.grandTotal), cu: "INR", tn: `Invoice ${data.invoiceNumber}`.slice(0, 50) })}`;
    QRCode.toDataURL(uri, { width: 160, margin: 0 })
      .then((url) => { if (active) setQrDataUrl(url); })
      .catch(() => { if (active) setQrDataUrl(null); });
    return () => { active = false; };
  }, [data.bank.upiId, data.bank.beneficiaryName, data.grandTotal, data.invoiceNumber]);

  return (
    <div
      className={`invoice-container relative mx-auto bg-white text-black font-sans leading-tight border border-gray-300 shadow-sm print:border-none print:shadow-none print:m-0 select-none flex flex-col justify-between ${
        isA5
          ? `w-[148mm] max-w-[148mm] h-[210mm] min-h-[210mm] max-h-[210mm] px-[6mm] ${isLetterPad ? "py-0" : "py-[4mm]"} text-[9px]`
          : `w-[210mm] max-w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] px-[8mm] ${isLetterPad ? "py-0" : "py-[6mm]"} text-[11px]`
      } ${className}`}
      style={{
        boxSizing: "border-box",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, Helvetica, sans-serif',
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,700;1,800&display=swap" />
      <style>{`
        @media print {
          @page {
            size: ${isA5 ? "148mm 210mm" : "210mm 297mm"};
            margin: 0mm;
          }
          html, body {
            width: ${isA5 ? "148mm" : "210mm"} !important;
            height: ${isA5 ? "210mm" : "297mm"} !important;
            min-height: ${isA5 ? "210mm" : "297mm"} !important;
            max-height: ${isA5 ? "210mm" : "297mm"} !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background-color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .invoice-container {
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: ${isLetterPad ? `0 ${isA5 ? "6mm" : "8mm"}` : isA5 ? "4mm 6mm" : "6mm 8mm"} !important;
            width: 100% !important;
            height: ${isA5 ? "210mm" : "297mm"} !important;
            min-height: ${isA5 ? "210mm" : "297mm"} !important;
            max-height: ${isA5 ? "210mm" : "297mm"} !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
        }
      `}</style>

      {/* Top 35mm Blank Spacing for Pre-printed Letter Pad Stationery */}
      {isLetterPad ? (
        <div
          className="shrink-0 w-full flex items-center justify-center border-b border-dashed border-slate-300 text-[10px] text-slate-400 select-none print:border-none print:text-transparent print:opacity-0"
          style={{ height: "35mm", minHeight: "35mm", maxHeight: "35mm" }}
          title="35 mm Blank Spacing for Pre-printed Letterhead"
        >
          <span className="no-print print:hidden tracking-wider uppercase font-semibold text-[9px] text-slate-400">
            ↑ 35 mm Blank Spacing (Pre-printed Letter Pad Header) ↑
          </span>
        </div>
      ) : null}

      {/* Middle Printable Document Body */}
      <div
        className="flex-1 flex flex-col justify-between overflow-hidden shrink-0"
        style={{
          minHeight: isA5 ? (isLetterPad ? "140mm" : "202mm") : (isLetterPad ? "227mm" : "285mm"),
          height: isA5 ? (isLetterPad ? "140mm" : "auto") : (isLetterPad ? "227mm" : "auto"),
        }}
      >
        {/* Brand Header: Logo Emblem + Mahavir Card (skipped on letter pad: already pre-printed) */}
        <header className="relative pt-0.5 px-1 shrink-0">
          {!isLetterPad ? (
            <div className="flex justify-between items-center pb-2 mb-1.5 border-b-2 border-black">
              {/* Left: Logo Emblem + Big Bold Mahavir Card & all printing solution */}
              <div className="flex items-center gap-3.5">
                <div className="w-16 h-16 relative shrink-0 rounded-full overflow-hidden border border-black shadow-xs">
                  <Image
                    src="/images/mahavir-card-logo.jpeg"
                    alt="Mahavir Card Emblem"
                    width={130}
                    height={130}
                    className="w-full h-full object-cover scale-105"
                    priority
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <h1
                    className="text-3xl font-black text-black tracking-tight leading-none uppercase"
                    style={{ fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif" }}
                  >
                    MAHAVIR CARD
                  </h1>
                  <p className="text-sm font-extrabold text-black tracking-wider uppercase mt-1 leading-none">
                    all printing solution
                  </p>
                </div>
              </div>

              {/* Right: TAX INVOICE & GSTIN */}
              <div className="text-right flex flex-col items-end justify-center pr-1">
                <div className="text-2xl font-black tracking-widest uppercase text-black leading-none">
                  TAX INVOICE
                </div>
                <div className="text-xs font-bold tracking-wide text-black mt-1.5">
                  <span>GSTIN : </span>
                  <span className="font-extrabold text-sm">{data.sellerGstin}</span>
                </div>
              </div>
            </div>
          ) : (
            /* GSTIN & TAX INVOICE Header Row (when on pre-printed letter pad) */
            <div className="flex justify-between items-baseline pt-0.5 pb-0.5 px-0.5 font-bold">
              <div className="text-[1.05em] tracking-wide text-black">
                <span>GSTIN : </span>
                <span className="font-extrabold">{data.sellerGstin}</span>
              </div>
              <div className="text-[1.18em] tracking-wider uppercase text-black font-black pr-3">
                TAX INVOICE
              </div>
            </div>
          )}
        </header>

        {/* 2-Column Metadata Box */}
        <div className="border border-black grid grid-cols-[54%_46%] text-[0.92em] mb-0.5 shrink-0">
          {/* Left Column: Seller (Mahavir Card) & Customer Details */}
          <div className="flex flex-col justify-between border-r border-black p-1">
            <div>
              {/* Mahavir Card Seller Details */}
              <div className="mb-1 pb-1 border-b border-black leading-tight text-[0.92em]">
                <p className="font-black uppercase text-[1.08em] tracking-wide text-black">Mahavir Card</p>
                <p className="text-gray-800 text-[0.88em]">5, Akshar Purushottam Flat, Sarangpur, Dolatkhana, Ahmedabad - 380001.</p>
                <p className="text-gray-800 text-[0.88em]">GSTIN : <strong className="text-black font-extrabold">{data.sellerGstin}</strong></p>
                <div className="flex flex-wrap items-center gap-x-2 text-[0.86em] text-gray-800 font-medium">
                  <span>www.mahavircard.in</span>
                  <span>·</span>
                  <span>mahavircard2011@gmail.com</span>
                </div>
              </div>

              {/* Customer Details */}
              <div className="flex items-start gap-1">
                <span className="font-bold shrink-0">M/s.</span>
                <span className="font-bold shrink-0">:</span>
                <span className="font-bold uppercase leading-tight text-[1.02em]">
                  {data.customer.name}
                </span>
              </div>
              {data.customer.companyName && data.customer.companyName !== data.customer.name ? (
                <p className="pl-6 font-semibold uppercase text-gray-800 text-[0.95em]">
                  {data.customer.companyName}
                </p>
              ) : null}
              <div className="pl-6 text-gray-900 leading-tight space-y-0.2 mt-0.5 text-[0.95em]">
                {data.customer.addressLine1 ? <p>{data.customer.addressLine1}</p> : null}
                {data.customer.addressLine2 ? <p>{data.customer.addressLine2}</p> : null}
                {data.customer.phone ? (
                  <p className="font-medium">
                    Mo, <span className="tabular-nums">{data.customer.phone}</span>
                  </p>
                ) : null}
              </div>
            </div>
            <div className="mt-1 pt-1 border-t border-black font-bold flex items-center gap-1">
              <span>GSTIN No.: </span>
              <span className="uppercase font-semibold tracking-wide">
                {data.customer.gstin || "URP (UNREGISTERED)"}
              </span>
            </div>
          </div>

          {/* Right Column: Invoice / Order / Terms Grid (Challan Removed) */}
          <div className="divide-y divide-black">
            {/* Invoice No & Date */}
            <div className="grid grid-cols-[60%_40%] divide-x divide-black p-1 items-center">
              <div className="whitespace-nowrap overflow-hidden">
                <span className="font-bold">INVOICE NO.: </span>
                <span className="font-bold text-[1.02em] tabular-nums">{data.invoiceNumber}</span>
              </div>
              <div className="pl-1 whitespace-nowrap overflow-hidden">
                <span className="font-bold">DT. </span>
                <span className="tabular-nums">{data.invoiceDate}</span>
              </div>
            </div>

            {/* Order No & Date */}
            <div className="grid grid-cols-[60%_40%] divide-x divide-black p-1 items-center">
              <div className="whitespace-nowrap overflow-hidden">
                <span className="font-bold">ORDER NO.: </span>
                <span className="font-bold text-[0.98em] tabular-nums">
                  {displayOrderNo}
                </span>
              </div>
              <div className="pl-1 whitespace-nowrap overflow-hidden">
                <span className="font-bold">DT. </span>
                <span className="tabular-nums">{data.orderDate}</span>
              </div>
            </div>

            {/* Terms */}
            <div className="p-1 whitespace-nowrap overflow-hidden">
              <span className="font-bold">TERMS: </span>
              <span className="font-medium">{data.terms || "Immediate"}</span>
            </div>
          </div>
        </div>

        {/* Itemized Table with Faded Watermark - Expanded to fill vertical space */}
        <div className="relative my-0.5 border border-black flex-1 flex flex-col justify-between min-h-0 overflow-hidden">
          {/* Faded Watermark Emblem in Background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06] overflow-hidden">
            <div className="w-[50mm] h-[50mm] relative rounded-full overflow-hidden">
              <Image
                src="/images/mahavir-card-logo.jpeg"
                alt="Watermark"
                width={200}
                height={200}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Table Structure */}
          <table className="w-full h-full border-collapse relative z-10 text-left flex-1" style={{ height: "100%" }}>
            <thead>
              <tr className="border-b border-black text-center font-bold text-[0.92em]">
                <th className="py-1 px-1 border-r border-black w-[5%]">S.<br />No.</th>
                <th className="py-1.5 px-2 border-r border-black w-[49%] text-center font-black tracking-wide text-[1.05em]">DESCRIPTION</th>
                <th className="py-1 px-1 border-r border-black w-[11%]">HSN<br />CODE</th>
                <th className="py-1 px-1 border-r border-black w-[9%]">QTY.</th>
                <th className="py-1 px-1 border-r border-black w-[9%]">RATE</th>
                <th className="py-1 px-1 border-r border-black w-[6%]">PER</th>
                <th className="py-1 px-1.5 w-[11%] text-right">
                  <div>AMOUNT</div>
                  <div className="text-[0.8em] font-normal flex justify-between px-1">
                    <span>Rs.</span>
                    <span>Ps.</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody style={{ height: "100%" }}>
              {data.items.map((item, idx) => (
                <tr key={item.id || idx} className="align-top font-normal text-[0.95em]">
                  <td className="py-2 px-1 border-r border-black text-center font-bold">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-2.5 border-r border-black font-extrabold text-[1.06em] uppercase tracking-tight text-black leading-snug">
                    {item.description}
                  </td>
                  <td className="py-2 px-1 border-r border-black text-center tabular-nums">
                    {item.hsnCode}
                  </td>
                  <td className="py-2 px-1 border-r border-black text-center tabular-nums font-bold text-[1.02em]">
                    {item.quantity}
                  </td>
                  <td className="py-2 px-1 border-r border-black text-right tabular-nums pr-1 font-semibold">
                    {formatNum(item.rate)}
                  </td>
                  <td className="py-2 px-1 border-r border-black text-center uppercase font-semibold">
                    {item.per}
                  </td>
                  <td className="py-2 px-1.5 text-right tabular-nums font-black text-[1.02em]">
                    {formatNum(item.amount)}
                  </td>
                </tr>
              ))}

              {/* Empty filler rows with borders to expand and maintain vertical table grid */}
              <tr
                style={{
                  height: "100%",
                }}
                className="h-full"
              >
                <td className="border-r border-black" />
                <td className="border-r border-black">
                  <div
                    style={{
                      height: isA5
                        ? isLetterPad
                          ? `${Math.max(10, 48 - data.items.length * 8)}mm`
                          : `${Math.max(12, 58 - data.items.length * 8)}mm`
                        : isLetterPad
                          ? `${Math.max(30, 108 - data.items.length * 10)}mm`
                          : `${Math.max(30, 114 - data.items.length * 10)}mm`,
                    }}
                  />
                </td>
                <td className="border-r border-black" />
                <td className="border-r border-black" />
                <td className="border-r border-black" />
                <td className="border-r border-black" />
                <td />
              </tr>
            </tbody>

          {/* Subtotals & Taxes Footer inside Table */}
          <tfoot>
            {/* SUB TOTAL */}
            <tr className="border-t border-black font-semibold">
              <td colSpan={4} className="border-r border-black" />
              <td colSpan={2} className="border-r border-black px-1.5 py-0.5 text-right font-bold uppercase">
                SUB TOTAL
              </td>
              <td className="px-1.5 py-0.5 text-right tabular-nums font-bold">
                {formatNum(data.subtotal)}
              </td>
            </tr>

            {/* CGST */}
            {data.cgstAmount > 0 ? (
              <tr className="border-t border-black">
                <td colSpan={4} className="border-r border-black" />
                <td colSpan={2} className="border-r border-black px-1.5 py-0.5 text-right font-medium">
                  OUTPUT CGST {data.cgstRate}%
                </td>
                <td className="px-1.5 py-0.5 text-right tabular-nums">
                  {formatNum(data.cgstAmount)}
                </td>
              </tr>
            ) : null}

            {/* SGST */}
            {data.sgstAmount > 0 ? (
              <tr className="border-t border-black">
                <td colSpan={4} className="border-r border-black" />
                <td colSpan={2} className="border-r border-black px-1.5 py-0.5 text-right font-medium">
                  OUTPUT SGST {data.sgstRate}%
                </td>
                <td className="px-1.5 py-0.5 text-right tabular-nums">
                  {formatNum(data.sgstAmount)}
                </td>
              </tr>
            ) : null}

            {/* IGST */}
            {data.igstAmount > 0 ? (
              <tr className="border-t border-black">
                <td colSpan={4} className="border-r border-black" />
                <td colSpan={2} className="border-r border-black px-1.5 py-0.5 text-right font-medium">
                  OUTPUT IGST {data.igstRate}%
                </td>
                <td className="px-1.5 py-0.5 text-right tabular-nums">
                  {formatNum(data.igstAmount)}
                </td>
              </tr>
            ) : null}

            {/* ROUND OFF */}
            <tr className="border-t border-black">
              <td colSpan={4} className="border-r border-black" />
              <td colSpan={2} className="border-r border-black px-1.5 py-0.5 font-bold uppercase text-right">
                ROUND OFF
              </td>
              <td className="px-1.5 py-0.5 text-right tabular-nums">
                {data.roundOff !== 0 ? (data.roundOff > 0 ? `+${formatNum(data.roundOff)}` : formatNum(data.roundOff)) : ""}
              </td>
            </tr>

            {/* G.TOTAL */}
            <tr className="border-t border-black">
              <td
                colSpan={6}
                className="border-r border-black px-3 py-1 font-black text-[1.12em] tracking-wider text-center uppercase"
              >
                G.TOTAL
              </td>
              <td className="px-1.5 py-1 text-right tabular-nums font-black text-[1.12em]">
                {formatNum(data.grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Amount in Words */}
      <div className="shrink-0 border-x border-b border-black py-1 px-2 font-bold text-[0.95em]">
        <span>AMOUNT : </span>
        <span className="font-semibold text-gray-900">{data.amountInWords}</span>
      </div>

      {/* Legal Declaration, QR Code, and Signature Block */}
      <div className="shrink-0 border-x border-b border-black grid grid-cols-[46%_22%_32%] divide-x divide-black p-1 items-center">
        {/* Left: Standard GST Declarations */}
        <div className="text-[0.8em] text-gray-900 leading-tight space-y-0.5 pr-1">
          <p>(1) GOODS ONCE SOLD NOT BE ACCEPTED BACK.</p>
          <p>(2) INTEREST AT 18% WILL BE CHARGED IF THE BILL IS NOT PAID WITH IN ONE WEEK.</p>
          <div className="flex justify-between items-baseline pt-0.5">
            <span>(3) SUBJECT OF AHMEDABAD JURISDICTION</span>
            <span className="font-bold text-[1.05em] pl-1">E. & O.E.</span>
          </div>
        </div>

        {/* Center: Official UPI Payment QR Code Card */}
        <div className="flex flex-col items-center justify-center p-0.5">
          <div className="border border-gray-400 rounded p-1 bg-white flex flex-col items-center shadow-xs">
            <span className="text-[7px] font-bold uppercase tracking-wider text-black mb-0.5">
              MAHAVIR CARD
            </span>
            <div className="w-[16mm] h-[16mm] relative bg-white">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- client-generated data URL, not an optimizable asset
                <img src={qrDataUrl} alt="UPI payment QR code" className="w-full h-full object-contain" />
              ) : null}
            </div>
          </div>
        </div>

        {/* Right: Signature Block */}
        <div className="flex flex-col justify-between text-right pl-2 h-full py-0.5">
          <div className="font-bold text-[0.95em]">
            For, <span className="uppercase font-black">MAHAVIR CARD</span>
          </div>
          <div className="mt-4 text-[0.85em] text-gray-800 font-medium">
            Authorised Signatory
          </div>
        </div>
      </div>

      {/* Bank Details Banner */}
      <div className="shrink-0 border-x border-b border-black py-1 px-2 text-center font-bold tracking-wide text-[0.95em] bg-white">
        <span>{data.bank.bankName} : </span>
        <span>A/C <strong>{data.bank.accountNumber}</strong></span>
        <span className="mx-2.5"> </span>
        <span>IFSC CODE : <strong>{data.bank.ifscCode}</strong></span>
      </div>

      {/* Footer Contact (skipped on letter pad: already pre-printed on letterhead footer) */}
      {!isLetterPad ? (
        <footer className="shrink-0 relative pt-1 px-1 pb-0.5">
          <div className="flex flex-col gap-0.5 text-[0.85em] text-gray-900 max-w-[65%]">
            <div className="flex items-center gap-1">
              <MapPin size={11} className="text-red-600 shrink-0" />
              <span>5, akshar purushottam flat, sarangpur, dolatkhana, ahmedabad - 380001.</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Phone size={11} className="text-emerald-600 shrink-0" />
                <span className="font-semibold tabular-nums">+91 94263 71150</span>
              </div>
              <div className="flex items-center gap-1">
                <Mail size={11} className="text-blue-600 shrink-0" />
                <span>mahavircard2011@gmail.com</span>
              </div>
            </div>
          </div>
        </footer>
      ) : null}
      </div>

      {/* Bottom 35mm Blank Spacing for Pre-printed Letter Pad Stationery */}
      {isLetterPad ? (
        <div
          className="shrink-0 w-full flex items-center justify-center border-t border-dashed border-slate-300 text-[10px] text-slate-400 select-none print:border-none print:text-transparent print:opacity-0"
          style={{ height: "35mm", minHeight: "35mm", maxHeight: "35mm" }}
          title="35 mm Blank Spacing for Pre-printed Letterhead Footer"
        >
          <span className="no-print print:hidden tracking-wider uppercase font-semibold text-[9px] text-slate-400">
            ↓ 35 mm Blank Spacing (Pre-printed Letter Pad Footer) ↓
          </span>
        </div>
      ) : null}
    </div>
  );
}
