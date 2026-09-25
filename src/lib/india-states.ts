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
export const commerceStates = indiaStates;
export type CommerceStateCode = IndiaStateCode;

export function indiaStateName(code: string) {
  return indiaStates.find(([candidate]) => candidate === code.toUpperCase())?.[1] ?? null;
}

export function isIndiaStateCode(code: string): code is IndiaStateCode {
  return indiaStates.some(([candidate]) => candidate === code.toUpperCase());
}

export function isCommerceStateCode(code: string): code is CommerceStateCode {
  return isIndiaStateCode(code);
}

export function isOutsideGujRaj(stateCode?: string | null): boolean {
  if (!stateCode) return false;
  const upper = stateCode.trim().toUpperCase();
  return upper !== "GJ" && upper !== "RJ" && upper !== "*";
}

export const COURIER_EXTRA_WEIGHT_NOTICE = "Courier charge will be applicable extra as per weight per kg";

export function normalizedCity(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-IN");
}

// Major cities / district headquarters — used as autocomplete suggestions on address
// forms, not an enforced enum. Customers in smaller towns can still type freely.
export const citiesByState: Partial<Record<string, string[]>> = {
  GJ: [
    "Ahmedabad", "Amreli", "Anand", "Bharuch", "Bhavnagar", "Bhuj", "Botad", "Dahod",
    "Deesa", "Gandhidham", "Gandhinagar", "Godhra", "Himatnagar", "Jamnagar", "Junagadh",
    "Kheda", "Mahesana", "Morbi", "Nadiad", "Navsari", "Palanpur", "Patan", "Porbandar",
    "Rajkot", "Surat", "Surendranagar", "Vadodara", "Valsad", "Vapi", "Veraval",
  ],
  RJ: [
    "Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Bharatpur", "Bhilwara", "Bikaner",
    "Bundi", "Chittorgarh", "Churu", "Dausa", "Dholpur", "Dungarpur", "Hanumangarh",
    "Jaipur", "Jaisalmer", "Jalore", "Jhalawar", "Jhunjhunu", "Jodhpur", "Karauli", "Kota",
    "Nagaur", "Pali", "Pratapgarh", "Rajsamand", "Sawai Madhopur", "Sikar", "Sirohi",
    "Sri Ganganagar", "Tonk", "Udaipur",
  ],
};

export function citiesForState(stateCode: string): string[] {
  return citiesByState[stateCode.toUpperCase()] ?? [];
}
