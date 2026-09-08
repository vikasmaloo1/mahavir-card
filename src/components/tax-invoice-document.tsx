"use client";

import React from "react";
import Image from "next/image";
import { MapPin, Phone, Mail } from "lucide-react";

import type { InvoiceData } from "@/lib/invoice-types";
import { shortenOrderNumber } from "@/lib/invoice-helper";

function formatNum(val: number | string | undefined | null): string {
  const n = Number(val || 0);
  return n.toFixed(2);
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

      {/* Top Colorful Faceted Geometric Ribbon (Top-Left) */}
      <div className="absolute top-0 left-0 w-[42%] h-[15mm] overflow-hidden pointer-events-none">
        <svg
          viewBox="0 0 320 85"
          className="w-full h-full object-cover"
          preserveAspectRatio="none"
        >
          {/* Deep Purples & Violets */}
          <polygon points="0,0 80,0 45,85 0,85" fill="#2d1754" />
          <polygon points="0,0 45,85 0,85" fill="#3c1b6b" />
          <polygon points="80,0 130,0 95,50 45,85" fill="#582687" />
          <polygon points="130,0 175,0 140,45 95,50" fill="#7a2a96" />
          {/* Magentas & Pinks */}
          <polygon points="175,0 215,0 185,40 140,45" fill="#a4288b" />
          <polygon points="215,0 250,0 220,35 185,40" fill="#cc2773" />
          <polygon points="140,45 185,40 170,75 110,85" fill="#e42e56" />
          {/* Reds & Oranges */}
          <polygon points="250,0 280,0 255,30 220,35" fill="#f04230" />
          <polygon points="185,40 220,35 210,65 170,75" fill="#f65e25" />
          <polygon points="280,0 305,0 285,25 255,30" fill="#f9851c" />
          {/* Yellows & Cyans */}
          <polygon points="220,35 255,30 250,55 210,65" fill="#fbb118" />
          <polygon points="305,0 320,0 305,20 285,25" fill="#fdd835" />
          <polygon points="210,65 250,55 235,80 170,75" fill="#26c6da" />
          <polygon points="250,55 285,25 270,70 235,80" fill="#00acc1" />
          <polygon points="170,75 235,80 200,85 110,85" fill="#8bc34a" />
        </svg>
      </div>

      {/* Brand Header: Logo Emblem + MAHAVIR CARD */}
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
              <h1
                className="text-[22px] font-black uppercase text-black leading-none tracking-wide"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                MAHAVIR CARD
              </h1>
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
            <div className="w-[18mm] h-[18mm] relative">
              <Image
                src="/images/qr/b2c-qr.jpg"
                alt="UPI QR Code"
                width={72}
                height={72}
                className="w-full h-full object-contain"
              />
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

        {/* Bottom-Right Colorful Faceted Geometric Ribbon */}
        <div className="absolute bottom-0 right-0 w-[38%] h-[14mm] overflow-hidden pointer-events-none">
          <svg
            viewBox="0 0 300 80"
            className="w-full h-full object-cover"
            preserveAspectRatio="none"
          >
            <polygon points="300,80 220,80 255,0 300,0" fill="#2d1754" />
            <polygon points="220,80 170,80 205,30 255,0" fill="#582687" />
            <polygon points="170,80 125,80 160,35 205,30" fill="#7a2a96" />
            <polygon points="125,80 85,80 115,40 160,35" fill="#a4288b" />
            <polygon points="85,80 50,80 80,45 115,40" fill="#cc2773" />
            <polygon points="160,35 115,40 130,5 190,0" fill="#e42e56" />
            <polygon points="50,80 20,80 45,50 80,45" fill="#f04230" />
            <polygon points="115,40 80,45 90,15 130,5" fill="#f65e25" />
            <polygon points="20,80 0,80 15,55 45,50" fill="#f9851c" />
            <polygon points="80,45 45,50 50,25 90,15" fill="#fbb118" />
            <polygon points="90,15 50,25 65,0 130,5" fill="#26c6da" />
            <polygon points="50,25 15,55 30,10 65,0" fill="#00acc1" />
            <polygon points="45,50 15,55 0,80 0,60" fill="#8bc34a" />
          </svg>
        </div>
      </footer>
    </div>
  );
}
