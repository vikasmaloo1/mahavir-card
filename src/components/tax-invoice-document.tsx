"use client";

import React from "react";
import Image from "next/image";
import { MapPin, Phone, Mail } from "lucide-react";

import type { InvoiceData } from "@/lib/invoice-types";

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

  return (
    <div
      className={`relative mx-auto bg-white text-black font-sans leading-tight border border-gray-300 shadow-sm print:border-none print:shadow-none print:m-0 ${
        isA5
          ? "w-[148mm] min-h-[208mm] p-2.5 text-[9.5px]"
          : "w-[210mm] min-h-[295mm] p-4 text-[11.5px]"
      } ${className}`}
      style={{
        boxSizing: "border-box",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      <style>{`
        @media print {
          @page {
            size: ${isA5 ? "148mm 210mm" : "210mm 297mm"};
            margin: 4mm;
          }
          body {
            background-color: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      {/* Top Colorful Faceted Geometric Ribbon */}
      <div className="absolute top-0 left-0 w-[45%] h-[18mm] overflow-hidden pointer-events-none">
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
          <polygon points="270,70 285,25 320,0 305,65" fill="#00838f" />
        </svg>
      </div>

      {/* Header with Mahavir Card Logo & Tagline */}
      <header className="relative flex items-start justify-between min-h-[16mm] pt-1">
        <div className="w-[45%]" />
        <div className="w-[55%] flex items-center justify-end gap-2.5">
          <div className="relative w-11 h-11 shrink-0 rounded-full overflow-hidden shadow-xs">
            <Image
              src="/images/mahavir-card-logo.jpeg"
              alt="Mahavir Card"
              width={48}
              height={48}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <div className="text-right">
            <h1
              className="text-xl sm:text-2xl font-black tracking-tight uppercase leading-none text-slate-900"
              style={{ fontFamily: "serif, 'Cinzel', 'Times New Roman'" }}
            >
              MAHAVIR CARD
            </h1>
            <p className="text-[10.5px] sm:text-[11.5px] font-medium text-slate-700 mt-0.5 tracking-normal">
              all kind printing solution
            </p>
          </div>
        </div>
      </header>

      {/* GSTIN & TAX INVOICE Bar */}
      <div className="mt-2.5 flex items-baseline justify-between border-b border-black pb-1">
        <div className="font-bold tracking-wide">
          <span>GSTIN : </span>
          <span className="font-mono text-[1.05em]">{data.sellerGstin}</span>
        </div>
        <div className="font-black tracking-wider text-[1.15em] uppercase text-center pr-12">
          TAX INVOICE
        </div>
        <div className="w-12 text-right text-[8px] text-gray-500 print:hidden">
          {data.resolvedPageSize}
        </div>
      </div>

      {/* Two-Column Metadata Box */}
      <div className="mt-1 border border-black grid grid-cols-[56%_44%] divide-x divide-black text-[0.95em]">
        {/* Left Column: Customer Details */}
        <div className="p-1.5 flex flex-col justify-between">
          <div>
            <div className="flex items-start gap-1">
              <span className="font-bold shrink-0">M/s.</span>
              <span className="font-bold shrink-0">:</span>
              <span className="font-bold uppercase break-words">
                {data.customer.name}
              </span>
            </div>
            {data.customer.companyName && data.customer.companyName !== data.customer.name ? (
              <p className="pl-6 font-semibold uppercase text-gray-800">
                {data.customer.companyName}
              </p>
            ) : null}
            <div className="pl-6 text-gray-900 space-y-0.5 mt-0.5">
              {data.customer.addressLine1 ? <p>{data.customer.addressLine1}</p> : null}
              {data.customer.addressLine2 ? <p>{data.customer.addressLine2}</p> : null}
              {data.customer.phone ? (
                <p className="font-medium">
                  Mo, <span className="font-mono">{data.customer.phone}</span>
                </p>
              ) : null}
            </div>
          </div>
          <div className="mt-2 pt-1 border-t border-gray-300 font-bold">
            <span>GSTIN No.: </span>
            <span className="font-mono uppercase">
              {data.customer.gstin || "URP (Unregistered)"}
            </span>
          </div>
        </div>

        {/* Right Column: Invoice Meta Grid */}
        <div className="divide-y divide-black">
          {/* Invoice No & Date */}
          <div className="grid grid-cols-[55%_45%] divide-x divide-black p-1">
            <div className="truncate">
              <span className="font-bold">INVOICE NO.: </span>
              <span className="font-bold font-mono text-[1.05em]">{data.invoiceNumber}</span>
            </div>
            <div className="pl-1 truncate">
              <span className="font-bold">DT. </span>
              <span className="font-mono">{data.invoiceDate}</span>
            </div>
          </div>

          {/* Challan No & Date */}
          <div className="grid grid-cols-[55%_45%] divide-x divide-black p-1">
            <div className="truncate">
              <span className="font-bold">CHALLAN NO.: </span>
              <span className="font-mono">{data.challanNumber}</span>
            </div>
            <div className="pl-1 truncate">
              <span className="font-bold">DT. </span>
              <span className="font-mono">{data.challanDate}</span>
            </div>
          </div>

          {/* Order No & Date */}
          <div className="grid grid-cols-[55%_45%] divide-x divide-black p-1">
            <div className="truncate">
              <span className="font-bold">ORDER NO.: </span>
              <span className="font-mono text-[0.9em]">{data.orderNumber}</span>
            </div>
            <div className="pl-1 truncate">
              <span className="font-bold">DT. </span>
              <span className="font-mono">{data.orderDate}</span>
            </div>
          </div>

          {/* Terms */}
          <div className="p-1 truncate">
            <span className="font-bold">TERMS: </span>
            <span className="font-medium">{data.terms}</span>
          </div>
        </div>
      </div>

      {/* Itemized Table with Faded Watermark */}
      <div className="relative mt-1 border border-black">
        {/* Faded Watermark Emblem in Background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.09] overflow-hidden">
          <div className="w-[60mm] h-[60mm] relative rounded-full overflow-hidden">
            <Image
              src="/images/mahavir-card-logo.jpeg"
              alt="Watermark"
              width={240}
              height={240}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Table Structure */}
        <table className="w-full border-collapse relative z-10 text-left">
          <thead>
            <tr className="border-b border-black text-center font-bold text-[0.95em]">
              <th className="py-1 px-1 border-r border-black w-[7%]">S.<br />No.</th>
              <th className="py-1 px-2 border-r border-black w-[44%] text-center">DESCRIPTION</th>
              <th className="py-1 px-1 border-r border-black w-[11%]">HSN<br />CODE</th>
              <th className="py-1 px-1 border-r border-black w-[9%]">QTY.</th>
              <th className="py-1 px-1 border-r border-black w-[10%]">RATE</th>
              <th className="py-1 px-1 border-r border-black w-[7%]">PER</th>
              <th className="py-1 px-1.5 w-[12%] text-right">
                <div>AMOUNT</div>
                <div className="text-[0.8em] font-semibold flex justify-between px-1">
                  <span>Rs.</span>
                  <span>Ps.</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody
            className="divide-y-0"
            style={{
              minHeight: isA5 ? "65mm" : "110mm",
            }}
          >
            {data.items.map((item, idx) => (
              <tr key={item.id || idx} className="align-top font-medium">
                <td className="py-1 px-1 border-r border-black text-center font-bold">
                  {idx + 1}
                </td>
                <td className="py-1 px-2 border-r border-black font-bold uppercase tracking-tight">
                  {item.description}
                </td>
                <td className="py-1 px-1 border-r border-black text-center font-mono">
                  {item.hsnCode}
                </td>
                <td className="py-1 px-1 border-r border-black text-center font-mono">
                  {item.quantity}
                </td>
                <td className="py-1 px-1 border-r border-black text-right font-mono pr-1">
                  {formatNum(item.rate)}
                </td>
                <td className="py-1 px-1 border-r border-black text-center uppercase">
                  {item.per}
                </td>
                <td className="py-1 px-1.5 text-right font-mono font-bold">
                  {formatNum(item.amount)}
                </td>
              </tr>
            ))}

            {/* Empty filler rows with borders to simulate full invoice height */}
            <tr
              style={{
                height: isA5
                  ? `${Math.max(15, 60 - data.items.length * 12)}mm`
                  : `${Math.max(30, 110 - data.items.length * 15)}mm`,
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
              <td colSpan={5} className="border-r border-black" />
              <td className="border-r border-black px-1 py-0.5 font-bold uppercase text-right">
                TOTAL
              </td>
              <td className="px-1.5 py-0.5 text-right font-mono font-bold">
                {formatNum(data.subtotal)}
              </td>
            </tr>

            {/* SGST */}
            <tr className="border-t border-black">
              <td colSpan={5} className="border-r border-black" />
              <td className="border-r border-black px-1 py-0.5 font-bold uppercase text-right">
                SGST {data.sgstRate}%
              </td>
              <td className="px-1.5 py-0.5 text-right font-mono font-bold">
                {data.sgstAmount > 0 ? formatNum(data.sgstAmount) : "-"}
              </td>
            </tr>

            {/* CGST */}
            <tr className="border-t border-black">
              <td colSpan={5} className="border-r border-black" />
              <td className="border-r border-black px-1 py-0.5 font-bold uppercase text-right">
                CGST {data.cgstRate}%
              </td>
              <td className="px-1.5 py-0.5 text-right font-mono font-bold">
                {data.cgstAmount > 0 ? formatNum(data.cgstAmount) : "-"}
              </td>
            </tr>

            {/* IGST */}
            <tr className="border-t border-black">
              <td colSpan={5} className="border-r border-black" />
              <td className="border-r border-black px-1 py-0.5 font-bold uppercase text-right">
                IGST {data.igstRate ? `${data.igstRate}%` : "%"}
              </td>
              <td className="px-1.5 py-0.5 text-right font-mono font-bold">
                {data.igstAmount > 0 ? formatNum(data.igstAmount) : ""}
              </td>
            </tr>

            {/* ROUND OFF */}
            <tr className="border-t border-black">
              <td colSpan={5} className="border-r border-black" />
              <td className="border-r border-black px-1 py-0.5 font-bold uppercase text-right text-[0.9em]">
                ROUND OFF
              </td>
              <td className="px-1.5 py-0.5 text-right font-mono">
                {data.roundOff !== 0 ? (data.roundOff > 0 ? `+${formatNum(data.roundOff)}` : formatNum(data.roundOff)) : ""}
              </td>
            </tr>

            {/* G.TOTAL */}
            <tr className="border-t border-black">
              <td
                colSpan={6}
                className="border-r border-black px-3 py-1 font-black text-right text-[1.15em] tracking-wider"
              >
                G.TOTAL
              </td>
              <td className="px-1.5 py-1 text-right font-black font-mono text-[1.25em]">
                {formatNum(data.grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Amount in Words */}
      <div className="mt-1 border border-black p-1 font-bold text-[0.95em]">
        <span>AMOUNT : </span>
        <span className="font-semibold">{data.amountInWords}</span>
      </div>

      {/* Declaration, QR Code, Signatory */}
      <div className="mt-1 border border-black grid grid-cols-[48%_22%_30%] divide-x divide-black p-1.5 text-[0.9em]">
        {/* Left Terms */}
        <div className="flex flex-col justify-between pr-1">
          <div className="space-y-0.5 text-[0.92em] text-gray-800">
            <p>(1) GOODS ONCE SOLD NOTE BE ACCEPTED BACK.</p>
            <p>(2) INTEREST AT 18% WILL BE CHARGED IF THE BILL IS NOT PAID WITH IN ONE WEEK.</p>
            <p>(3) SUBJECT OF AHMEDABAD JURISDICTION</p>
          </div>
          <div className="mt-2 font-bold text-right pr-2">E. & O.E.</div>
        </div>

        {/* Center QR Code */}
        <div className="flex flex-col items-center justify-center p-0.5">
          <span className="text-[7.5px] font-bold tracking-wider text-center uppercase mb-0.5">
            MAHAVIR CARD
          </span>
          <div className="w-[18mm] h-[18mm] relative border border-gray-300 rounded p-0.5 bg-white">
            <Image
              src={data.bank.qrImageUrl || "/images/qr/b2c-qr.jpg"}
              alt="Scan to Pay"
              width={80}
              height={80}
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Right Signatory */}
        <div className="flex flex-col justify-between text-right pl-1">
          <div className="font-bold">
            For, <span className="uppercase font-black">MAHAVIR CARD</span>
          </div>
          <div className="mt-6 text-[0.9em] text-gray-700 font-medium">
            Authorised Signatory
          </div>
        </div>
      </div>

      {/* Bank Details Banner */}
      <div className="mt-1 border border-black py-1 px-2 text-center font-bold tracking-wide text-[0.95em] bg-gray-50/50">
        <span>{data.bank.bankName} : </span>
        <span>A/C <strong className="font-mono tracking-wider">{data.bank.accountNumber}</strong></span>
        <span className="mx-2"> </span>
        <span>IFSC CODE : <strong className="font-mono tracking-wider">{data.bank.ifscCode}</strong></span>
      </div>

      {/* Footer Contact & Bottom Faceted Geometric Bar */}
      <footer className="mt-2 pt-1 relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[0.88em] text-gray-800 pr-1">
          <div className="flex items-center gap-1">
            <MapPin size={11} className="text-red-600 shrink-0" />
            <span>5, akshar purushottam flat, sarangpur, dolatkhana, ahmedabad - 380001.</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Phone size={11} className="text-emerald-600 shrink-0" />
              <span className="font-mono font-semibold">+91 94263 71150</span>
            </div>
            <div className="flex items-center gap-1">
              <Mail size={11} className="text-blue-600 shrink-0" />
              <span>mahavircard2011@gmail.com</span>
            </div>
          </div>
        </div>

        {/* Bottom Faceted Rainbow Ribbon */}
        <div className="mt-1.5 w-full h-[6mm] overflow-hidden">
          <svg
            viewBox="0 0 600 20"
            className="w-full h-full object-cover"
            preserveAspectRatio="none"
          >
            <polygon points="0,20 40,0 80,20" fill="#351c68" />
            <polygon points="40,0 80,20 120,0" fill="#6a2899" />
            <polygon points="80,20 120,0 160,20" fill="#a4288b" />
            <polygon points="120,0 160,20 200,0" fill="#e42e56" />
            <polygon points="160,20 200,0 240,20" fill="#f46128" />
            <polygon points="200,0 240,20 280,0" fill="#fca11a" />
            <polygon points="240,20 280,0 320,20" fill="#fed835" />
            <polygon points="280,0 320,20 360,0" fill="#8bc34a" />
            <polygon points="320,20 360,0 400,20" fill="#26c6da" />
            <polygon points="360,0 400,20 440,0" fill="#00838f" />
            <polygon points="400,20 440,0 480,20" fill="#7a2a96" />
            <polygon points="440,0 480,20 520,0" fill="#e42e56" />
            <polygon points="480,20 520,0 560,20" fill="#f9851c" />
            <polygon points="520,0 560,20 600,0" fill="#fed835" />
          </svg>
        </div>
      </footer>
    </div>
  );
}
