const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];

const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function convertLessThanThousand(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n];
  if (n < 100) {
    const rem = n % 10;
    return `${TENS[Math.floor(n / 10)]}${rem ? " " + ONES[rem] : ""}`;
  }
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  return `${ONES[hundred]} Hundred${rest ? " " + convertLessThanThousand(rest) : ""}`;
}

export function numberToIndianWords(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return "Zero Only.";
  const rounded = Math.round(amount * 100) / 100;
  const rupees = Math.floor(Math.abs(rounded));
  const paise = Math.round((Math.abs(rounded) - rupees) * 100);

  if (rupees === 0 && paise === 0) return "Zero Only.";

  let remaining = rupees;
  const parts: string[] = [];

  // Crores (>= 1,00,00,000)
  if (remaining >= 10000000) {
    const crores = Math.floor(remaining / 10000000);
    remaining %= 10000000;
    parts.push(`${convertLessThanThousand(crores)} Crore`);
  }

  // Lakhs (>= 1,00,000)
  if (remaining >= 100000) {
    const lakhs = Math.floor(remaining / 100000);
    remaining %= 100000;
    parts.push(`${convertLessThanThousand(lakhs)} Lakh`);
  }

  // Thousands (>= 1,000)
  if (remaining >= 1000) {
    const thousands = Math.floor(remaining / 1000);
    remaining %= 1000;
    parts.push(`${convertLessThanThousand(thousands)} Thousand`);
  }

  // Hundreds & Remaining (0-999)
  if (remaining > 0) {
    parts.push(convertLessThanThousand(remaining));
  }

  const rupeesPart = parts.join(" ").trim();
  const paisePart = paise > 0 ? convertLessThanThousand(paise) : "";

  if (rupeesPart && paisePart) {
    return `${rupeesPart} Rupees and ${paisePart} Paise Only.`;
  }
  if (rupeesPart) {
    return `${rupeesPart} Only.`;
  }
  if (paisePart) {
    return `${paisePart} Paise Only.`;
  }
  return "Zero Only.";
}
