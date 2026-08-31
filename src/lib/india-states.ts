export const indiaStates = [
  ["AN", "Andaman and Nicobar Islands"], ["AP", "Andhra Pradesh"], ["AR", "Arunachal Pradesh"],
  ["AS", "Assam"], ["BR", "Bihar"], ["CH", "Chandigarh"], ["CG", "Chhattisgarh"],
  ["DN", "Dadra and Nagar Haveli and Daman and Diu"], ["DL", "Delhi"], ["GA", "Goa"],
  ["GJ", "Gujarat"], ["HR", "Haryana"], ["HP", "Himachal Pradesh"], ["JK", "Jammu and Kashmir"],
  ["JH", "Jharkhand"], ["KA", "Karnataka"], ["KL", "Kerala"], ["LA", "Ladakh"],
  ["LD", "Lakshadweep"], ["MP", "Madhya Pradesh"], ["MH", "Maharashtra"], ["MN", "Manipur"],
  ["ML", "Meghalaya"], ["MZ", "Mizoram"], ["NL", "Nagaland"], ["OD", "Odisha"],
  ["PY", "Puducherry"], ["PB", "Punjab"], ["RJ", "Rajasthan"], ["SK", "Sikkim"],
  ["TN", "Tamil Nadu"], ["TS", "Telangana"], ["TR", "Tripura"], ["UP", "Uttar Pradesh"],
  ["UK", "Uttarakhand"], ["WB", "West Bengal"],
] as const;

export type IndiaStateCode = typeof indiaStates[number][0];
export const commerceStates = [["GJ", "Gujarat"], ["RJ", "Rajasthan"]] as const;
export type CommerceStateCode = typeof commerceStates[number][0];

export function indiaStateName(code: string) {
  return indiaStates.find(([candidate]) => candidate === code.toUpperCase())?.[1] ?? null;
}

export function isIndiaStateCode(code: string): code is IndiaStateCode {
  return indiaStates.some(([candidate]) => candidate === code.toUpperCase());
}

export function isCommerceStateCode(code: string): code is CommerceStateCode {
  return commerceStates.some(([candidate]) => candidate === code.toUpperCase());
}

export function normalizedCity(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-IN");
}
