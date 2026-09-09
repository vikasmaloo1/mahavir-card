/**
 * Calculates the Indian Financial Year string from a given date.
 * Indian Financial Year runs from April 1 to March 31.
 * For example:
 *   - Any date between 1 April 2026 and 31 March 2027 => "26-27"
 *   - Any date between 1 April 2027 and 31 March 2028 => "27-28"
 */
export function getFinancialYear(date: Date | string | null | undefined = new Date()): string {
  const d = date ? (typeof date === "string" ? new Date(date) : date) : new Date();
  const validDate = isNaN(d.getTime()) ? new Date() : d;

  // In Indian Standard Time (UTC+05:30), calculate exact IST calendar date
  const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
  const istTime = new Date(validDate.getTime() + istOffsetMs + validDate.getTimezoneOffset() * 60000);

  const month = istTime.getMonth(); // 0 = Jan, 3 = April
  const fullYear = istTime.getFullYear();

  const startYear = month >= 3 ? fullYear : fullYear - 1;
  const endYear = startYear + 1;

  const startYY = String(startYear).slice(-2);
  const endYY = String(endYear).slice(-2);

  return `${startYY}-${endYY}`;
}

/**
 * Formats the official invoice number string: MVC/YY-YY/00001
 * Uses a 5-digit zero-padded auto-incrementing serial number.
 */
export function formatInvoiceNumber(year: string, sequence: number): string {
  const paddedSeq = String(sequence).padStart(5, "0");
  return `MVC/${year}/${paddedSeq}`;
}

/**
 * Parses an invoice number into its financial year and sequence components
 * if it matches the standard format MVC/YY-YY/NNNNN.
 */
export function parseInvoiceNumber(invNum: string | undefined | null): {
  year?: string;
  sequence?: number;
} {
  if (!invNum) return {};
  const match = String(invNum).trim().match(/^MVC\/(\d{2}-\d{2})\/(\d+)$/i);
  if (!match) return {};
  return {
    year: match[1],
    sequence: parseInt(match[2], 10),
  };
}

