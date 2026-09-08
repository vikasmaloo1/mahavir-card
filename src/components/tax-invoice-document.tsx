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

// Rainbow honeycomb corner graphic (pointy-top hexagon tessellation), matching the printed bill book.
const HEX_COLORS = ["#4a2a8a", "#5b2a86", "#7a2a96", "#a4288b", "#cc2773", "#e42e56", "#f04230", "#f9851c", "#fbb118", "#fdd835", "#8bc34a", "#26c6da", "#00acc1", "#3949ab"];

function hexPoints(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 90);
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`);
  }
  return pts.join(" ");
}

function buildHexGrid(cols: number, rows: number, r: number) {
  const hSpacing = r * Math.sqrt(3);
  const vSpacing = r * 1.5;
  const hexes: { cx: number; cy: number; color: string }[] = [];
  for (let row = 0; row < rows; row++) {
    const offset = row % 2 === 1 ? hSpacing / 2 : 0;
    for (let col = 0; col < cols; col++) {
      hexes.push({
        cx: offset + col * hSpacing + r,
        cy: row * vSpacing + r,
        color: HEX_COLORS[(row * 3 + col) % HEX_COLORS.length],
      });
    }
  }
  return { hexes, width: cols * hSpacing + hSpacing, height: rows * vSpacing + r };
}

function HexCorner({ flip = false }: { flip?: boolean }) {
  const r = 15;
  const { hexes, width, height } = buildHexGrid(7, 5, r);
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`w-full h-full ${flip ? "rotate-180" : ""}`}
      preserveAspectRatio="xMinYMin slice"
    >
      {hexes.map((h, i) => (
        <polygon key={i} points={hexPoints(h.cx, h.cy, r * 0.97)} fill={h.color} />
      ))}
    </svg>
  );
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
}: {
  data: InvoiceData;
  className?: string;
}) {
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
      className={`invoice-container relative mx-auto bg-white text-black font-sans leading-tight border border-gray-300 shadow-sm print:border-none print:shadow-none print:m-0 select-none ${
        isA5
          ? "w-[148mm] max-w-[148mm] min-h-[205mm] max-h-[208mm] p-2 text-[9px]"
          : "w-[210mm] max-w-[210mm] min-h-[290mm] max-h-[295mm] p-3.5 text-[11px]"
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
            padding: ${isA5 ? "6mm" : "8mm"} !important;
            width: 100% !important;
            height: 100% !important;
            max-height: 100% !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
          }
        }
      `}</style>

      {/* Top-Left Rainbow Honeycomb Corner */}
      <div className="absolute top-0 left-0 w-[38%] h-[16mm] overflow-hidden pointer-events-none">
        <HexCorner />
      </div>

      {/* Brand Header: Logo Emblem + Mahavir Card */}
      <header className="relative pt-0.5 px-0.5">
        <div className="flex justify-end items-center mb-1">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 relative shrink-0 rounded-full overflow-hidden">
              <Image
                src="/images/mahavir-card-logo.jpeg"
                alt="Mahavir Card Emblem"
                width={80}
                height={80}
                className="w-full h-full object-cover scale-110"
              />
            </div>
            <div>
              <Wordmark />
              <p className="text-[9.5px] text-gray-700 tracking-normal leading-tight mt-0.5 font-sans font-medium">
                all kind printing solution
              </p>
            </div>
          </div>
        </div>

        {/* GSTIN & TAX INVOICE Header Row */}
        <div className="flex justify-between items-baseline pt-1 pb-0.5 px-0.5 font-bold">
          <div className="text-[1.05em] tracking-wide text-black">
            <span>GSTIN : </span>
            <span className="font-extrabold">{data.sellerGstin}</span>
          </div>
          <div className="text-[1.18em] tracking-wider uppercase text-black font-black pr-3">
            TAX INVOICE
          </div>
        </div>
      </header>

      {/* 2-Column Metadata Box */}
      <div className="border border-black grid grid-cols-[54%_46%] text-[0.92em]">
        {/* Left Column: Customer Details */}
        <div className="flex flex-col justify-between border-r border-black p-1">
          <div>
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

        {/* Right Column: Invoice / Challan / Order / Terms Grid */}
        <div className="divide-y divide-black">
          {/* Invoice No & Date */}
          <div className="grid grid-cols-[56%_44%] divide-x divide-black p-1 items-center">
            <div className="whitespace-nowrap overflow-hidden">
              <span className="font-bold">INVOICE NO.: </span>
              <span className="font-bold text-[1.02em] tabular-nums">{data.invoiceNumber}</span>
            </div>
            <div className="pl-1 whitespace-nowrap overflow-hidden">
              <span className="font-bold">DT. </span>
              <span className="tabular-nums">{data.invoiceDate}</span>
            </div>
          </div>

          {/* Challan No & Date */}
          <div className="grid grid-cols-[56%_44%] divide-x divide-black p-1 items-center">
            <div className="whitespace-nowrap overflow-hidden">
              <span className="font-bold">CHALLAN NO.: </span>
              <span className="tabular-nums">{data.challanNumber}</span>
            </div>
            <div className="pl-1 whitespace-nowrap overflow-hidden">
              <span className="font-bold">DT. </span>
              <span className="tabular-nums">{data.challanDate}</span>
            </div>
          </div>

          {/* Order No & Date */}
          <div className="grid grid-cols-[56%_44%] divide-x divide-black p-1 items-center">
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

      {/* Itemized Table with Faded Watermark */}
      <div className="relative mt-1 border border-black">
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
        <table className="w-full border-collapse relative z-10 text-left">
          <thead>
            <tr className="border-b border-black text-center font-bold text-[0.92em]">
              <th className="py-1 px-1 border-r border-black w-[6%]">S.<br />No.</th>
              <th className="py-1 px-2 border-r border-black w-[44%] text-center">DESCRIPTION</th>
              <th className="py-1 px-1 border-r border-black w-[12%]">HSN<br />CODE</th>
              <th className="py-1 px-1 border-r border-black w-[10%]">QTY.</th>
              <th className="py-1 px-1 border-r border-black w-[10%]">RATE</th>
              <th className="py-1 px-1 border-r border-black w-[7%]">PER</th>
              <th className="py-1 px-1.5 w-[11%] text-right">
                <div>AMOUNT</div>
                <div className="text-[0.8em] font-normal flex justify-between px-1">
                  <span>Rs.</span>
                  <span>Ps.</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody style={{ minHeight: isA5 ? "52mm" : "100mm" }}>
            {data.items.map((item, idx) => (
              <tr key={item.id || idx} className="align-top font-normal text-[0.95em]">
                <td className="py-1 px-1 border-r border-black text-center font-bold">
                  {idx + 1}
                </td>
                <td className="py-1 px-2 border-r border-black font-bold uppercase tracking-tight">
                  {item.description}
                </td>
                <td className="py-1 px-1 border-r border-black text-center tabular-nums">
                  {item.hsnCode}
                </td>
                <td className="py-1 px-1 border-r border-black text-center tabular-nums font-semibold">
                  {item.quantity}
                </td>
                <td className="py-1 px-1 border-r border-black text-right tabular-nums pr-1">
                  {formatNum(item.rate)}
                </td>
                <td className="py-1 px-1 border-r border-black text-center uppercase font-semibold">
                  {item.per}
                </td>
                <td className="py-1 px-1.5 text-right tabular-nums font-bold">
                  {formatNum(item.amount)}
                </td>
              </tr>
            ))}

            {/* Empty filler rows with borders to maintain vertical table grid */}
            <tr
              style={{
                height: isA5
                  ? `${Math.max(12, 50 - data.items.length * 9)}mm`
                  : `${Math.max(25, 95 - data.items.length * 14)}mm`,
              }}
            >
              <td className="border-r border-black" />
              <td className="border-r border-black" />
              <td className="border-r border-black" />
              <td className="border-r border-black" />
              <td className="border-r border-black" />
              <td className="border-r border-black" />
              <td />
            </tr>
          </tbody>

          {/* Subtotals & Taxes Footer inside Table */}
          <tfoot>
            {/* TOTAL */}
            <tr className="border-t border-black">
              <td colSpan={4} className="border-r border-black" />
              <td colSpan={2} className="border-r border-black px-1.5 py-0.5 font-bold uppercase text-right">
                TOTAL
              </td>
              <td className="px-1.5 py-0.5 text-right tabular-nums font-bold">
                {formatNum(data.subtotal)}
              </td>
            </tr>

            {/* SGST */}
            <tr className="border-t border-black">
              <td colSpan={4} className="border-r border-black" />
              <td colSpan={2} className="border-r border-black px-1.5 py-0.5 font-bold uppercase text-right">
                SGST {data.sgstRate}%
              </td>
              <td className="px-1.5 py-0.5 text-right tabular-nums font-bold">
                {data.sgstAmount > 0 ? formatNum(data.sgstAmount) : "-"}
              </td>
            </tr>

            {/* CGST */}
            <tr className="border-t border-black">
              <td colSpan={4} className="border-r border-black" />
              <td colSpan={2} className="border-r border-black px-1.5 py-0.5 font-bold uppercase text-right">
                CGST {data.cgstRate}%
              </td>
              <td className="px-1.5 py-0.5 text-right tabular-nums font-bold">
                {data.cgstAmount > 0 ? formatNum(data.cgstAmount) : "-"}
              </td>
            </tr>

            {/* IGST */}
            <tr className="border-t border-black">
              <td colSpan={4} className="border-r border-black" />
              <td colSpan={2} className="border-r border-black px-1.5 py-0.5 font-bold uppercase text-right">
                IGST {data.igstRate ? `${data.igstRate}%` : "%"}
              </td>
              <td className="px-1.5 py-0.5 text-right tabular-nums font-bold">
                {data.igstAmount > 0 ? formatNum(data.igstAmount) : ""}
              </td>
            </tr>

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
      <div className="border-x border-b border-black py-1 px-2 font-bold text-[0.95em]">
        <span>AMOUNT : </span>
        <span className="font-semibold text-gray-900">{data.amountInWords}</span>
      </div>

      {/* Legal Declaration, QR Code, and Signature Block */}
      <div className="border-x border-b border-black grid grid-cols-[46%_22%_32%] divide-x divide-black p-1.5 items-center">
        {/* Left: Standard GST Declarations */}
        <div className="text-[0.8em] text-gray-900 leading-tight space-y-0.5 pr-1">
          <p>(1) GOODS ONCE SOLD NOTE BE ACCEPTED BACK.</p>
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
            <div className="w-[18mm] h-[18mm] relative bg-white">
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
          <div className="mt-5 text-[0.9em] text-gray-800 font-medium">
            Authorised Signatory
          </div>
        </div>
      </div>

      {/* Bank Details Banner */}
      <div className="border-x border-b border-black py-1 px-2 text-center font-bold tracking-wide text-[0.95em] bg-white">
        <span>{data.bank.bankName} : </span>
        <span>A/C <strong>{data.bank.accountNumber}</strong></span>
        <span className="mx-2.5"> </span>
        <span>IFSC CODE : <strong>{data.bank.ifscCode}</strong></span>
      </div>

      {/* Footer Contact & Bottom Faceted Geometric Ribbon */}
      <footer className="relative pt-1 px-1 pb-0.5">
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

        {/* Bottom-Right Rainbow Honeycomb Corner */}
        <div className="absolute bottom-0 right-0 w-[35%] h-[15mm] overflow-hidden pointer-events-none">
          <HexCorner flip />
        </div>
      </footer>
    </div>
  );
}
