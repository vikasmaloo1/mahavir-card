export type PdfPriceRow = {
  productSlug: string;
  name: string;
  quantity: number;
  amount: string;
  unit: "batch" | "piece";
  options: Record<string, string>;
};

const rows = (productSlug: string, name: string, quantity: number, values: Array<[string, string]>, unit: PdfPriceRow["unit"] = "batch") => values.map(([label, amount]) => ({ productSlug, name: label, quantity, amount, unit, options: { specification: label } }));

export const pdfPricingRows: PdfPriceRow[] = [
  ...businessCardProducts.map((product) => ({ productSlug: product.slug, name: product.name, quantity: 1000, amount: product.price, unit: "batch" as const, options: {} })),
  ...rows("paper-job", "Paper Job", 1000, [["80 GSM Sunsine", "1000"], ["100 GSM SSP", "1100"], ["100 GSM 210x297 Alabaster", "1100"], ["100 GSM EXE Bond", "1300"]]),
  ...rows("cover-job", "Cover Job", 1000, [["80 GSM SSP 9.5x4.25", "1200"], ["100 GSM SSP 9.5x4.25", "1300"], ["100 GSM Alabaster", "1300"], ["11x5 100 GSM", "2400"]]),
  ...rows("gsm-130-170", "130 GSM - 170 GSM", 1000, [["130 GSM single side", "1300"], ["130 GSM front back", "1800"], ["170 GSM single side", "1700"], ["170 GSM front back", "2000"]]),
  ...rows("sticker-mix-hm", "Sticker Mix - HM", 1000, [["Without lamination", "0.30"], ["With lamination", "0.35"], ["PVC sticker", "0.80"]], "piece"),
  ...rows("mix-250gsm", "250 GSM Mix", 1000, [["Single side", "0.30"], ["Front back without lamination", "0.35"], ["Front back with lamination", "0.40"], ["A4 size 250 GSM single side", "2600"], ["A4 size 250 GSM F-B without lamination", "3000"], ["A4 size 250 GSM F-B with lamination", "3400"]]),
  ...rows("pamphlets", "Pamphlets 90/130/90/130 GSM", 2000, [["90 GSM single side", "2400"], ["130 GSM single side", "2600"], ["90 GSM front back", "3000"], ["130 GSM front back", "3400"]]),
  ...rows("pamphlets", "Pamphlets 90/130/90/130 GSM", 4000, [["90 GSM single side", "4600"], ["130 GSM single side", "5200"], ["90 GSM front back", "5200"], ["130 GSM front back", "5600"]]),
  ...rows("pamphlets", "Pamphlets 90/130/90/130 GSM", 5000, [["90 GSM single side", "5800"], ["130 GSM single side", "6400"], ["90 GSM front back", "6200"], ["130 GSM front back", "6800"]]),
  ...rows("pamphlets", "Pamphlets 90/130/90/130 GSM", 10000, [["90 GSM single side", "8200"], ["130 GSM single side", "10200"], ["90 GSM front back", "8600"], ["130 GSM front back", "10800"]]),
  ...rows("pamphlets", "Pamphlets 90/130/90/130 GSM", 20000, [["90 GSM single side", "16000"], ["130 GSM single side", "19000"], ["90 GSM front back", "17500"], ["130 GSM front back", "21500"]]),
  ...rows("sticker-print", "Stikar Print", 200, [["Without lamination", "2800"], ["With lamination", "3200"]]),
  ...rows("sticker-print", "Stikar Print", 300, [["Without lamination", "3400"], ["With lamination", "3600"]]),
  ...rows("sticker-print", "Stikar Print", 400, [["Without lamination", "3800"], ["With lamination", "4200"]]),
  ...rows("sticker-print", "Stikar Print", 500, [["Without lamination", "4200"], ["With lamination", "4600"]]),
  ...rows("sticker-print", "Stikar Print", 600, [["Without lamination", "4800"], ["With lamination", "5200"]]),
  ...rows("sticker-print", "Stikar Print", 700, [["Without lamination", "5200"], ["With lamination", "5800"]]),
  ...rows("sticker-print", "Stikar Print", 800, [["Without lamination", "5400"], ["With lamination", "6400"]]),
  ...rows("sticker-print", "Stikar Print", 900, [["Without lamination", "5600"], ["With lamination", "6600"]]),
  ...rows("sticker-print", "Stikar Print", 1000, [["Without lamination", "5800"], ["With lamination", "6800"]]),
  ...rows("doctor-file-job", "Doctor File Job", 1000, [["360 GSM weight bag duplex 9x12, PVC clip", "9.75"]], "piece"),
  ...rows("doctor-file-job", "Doctor File Job", 2000, [["360 GSM weight bag duplex 9x12, PVC clip", "9.50"]], "piece"),
  ...rows("doctor-file-job", "Doctor File Job", 3000, [["360 GSM weight bag duplex 9x12, PVC clip", "9.25"]], "piece"),
  ...rows("doctor-file-job", "Doctor File Job", 4000, [["360 GSM weight bag duplex 9x12, PVC clip", "9.00"]], "piece"),
  ...rows("doctor-file-job", "Doctor File Job", 5000, [["360 GSM weight bag duplex 9x12, PVC clip", "9.00"]], "piece"),
  ...rows("doctor-file-job", "Doctor File Job", 6000, [["360 GSM weight bag duplex 9x12, PVC clip", "8.75"]], "piece"),
  ...rows("doctor-file-job", "Doctor File Job", 7000, [["360 GSM weight bag duplex 9x12, PVC clip", "8.75"]], "piece"),
  ...rows("doctor-file-job", "Doctor File Job", 8000, [["360 GSM weight bag duplex 9x12, PVC clip", "8.50"]], "piece"),
  ...rows("doctor-file-job", "Doctor File Job", 9000, [["360 GSM weight bag duplex 9x12, PVC clip", "8.50"]], "piece"),
  ...rows("doctor-file-job", "Doctor File Job", 10000, [["360 GSM weight bag duplex 9x12, PVC clip", "8.25"]], "piece"),
  ...rows("job-250gsm", "250 GSM Job", 200, [["11x17 with lamination + crizing / 8.25x22.5", "3000"]]),
  ...rows("job-250gsm", "250 GSM Job", 300, [["11x17 with lamination + crizing / 8.25x22.5", "3200"]]),
  ...rows("job-250gsm", "250 GSM Job", 400, [["11x17 with lamination + crizing / 8.25x22.5", "3600"]]),
  ...rows("job-250gsm", "250 GSM Job", 500, [["11x17 with lamination + crizing / 8.25x22.5", "4000"]]),
  ...rows("job-250gsm", "250 GSM Job", 600, [["11x17 with lamination + crizing / 8.25x22.5", "4400"]]),
  ...rows("job-250gsm", "250 GSM Job", 700, [["11x17 with lamination + crizing / 8.25x22.5", "4800"]]),
  ...rows("job-250gsm", "250 GSM Job", 800, [["11x17 with lamination + crizing / 8.25x22.5", "5400"]]),
  ...rows("job-250gsm", "250 GSM Job", 900, [["11x17 with lamination + crizing / 8.25x22.5", "6000"]]),
  ...rows("job-250gsm", "250 GSM Job", 1000, [["11x17 with lamination + crizing / 8.25x22.5", "6800"]]),
];
import { businessCardProducts } from "@/lib/business-cards";
