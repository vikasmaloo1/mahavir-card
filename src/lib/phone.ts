export function normalizePhoneNumber(value: string) {
  const compact = value.trim().replace(/[\s()-]/g, "");
  if (/^\d{10}$/.test(compact)) return `+91${compact}`;
  if (/^0091\d{10}$/.test(compact)) return `+${compact.slice(2)}`;
  return compact;
}

export function isValidIndianPhoneNumber(value: string) {
  return /^\+91[6-9]\d{9}$/.test(normalizePhoneNumber(value));
}
