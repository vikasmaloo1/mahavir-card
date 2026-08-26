export type BusinessCardProduct = {
  slug: string;
  name: string;
  price: string;
  description: string;
  supportsPremiumAddons?: boolean;
};

export const businessCardProducts: BusinessCardProduct[] = [
  { slug: "business-card-nt-single-side", name: "NT Single Side", price: "300", description: "Standard NT visiting cards, printed on one side." },
  { slug: "business-card-nt-front-back", name: "NT Front Back", price: "350", description: "NT visiting cards with front and back printing.", supportsPremiumAddons: true },
  { slug: "business-card-tearable-single-side", name: "Tearable Single Side", price: "250", description: "Tearable visiting cards, printed on one side." },
  { slug: "business-card-tearable-front-back", name: "Tearable F-B Without Lamination", price: "300", description: "Tearable visiting cards with front and back printing." },
  { slug: "business-card-tearable-front-back-lamination", name: "Tearable F-B With Lamination", price: "350", description: "Tearable visiting cards with front and back printing and lamination." },
  { slug: "business-card-350gsm-matt", name: "350 GSM Matt Single + F-B Same Rate", price: "500", description: "350 GSM matt visiting cards for single-side or front-back printing.", supportsPremiumAddons: true },
  { slug: "business-card-350gsm-matt-round-cut", name: "350 GSM Matt Round Cut", price: "650", description: "350 GSM matt visiting cards with rounded corners." },
  { slug: "business-card-400gsm-matt-single-side-uv", name: "400 GSM Matt Single Side UV Card", price: "650", description: "400 GSM matt visiting cards with single-side UV finish." },
  { slug: "business-card-400gsm-single-side-uv-round-cut", name: "400 GSM Single Side UV Card Round Cut", price: "800", description: "400 GSM single-side UV visiting cards with rounded corners." },
  { slug: "business-card-400gsm-matt-uv-front-back", name: "400 GSM Matt UV F-B Card", price: "750", description: "400 GSM matt UV visiting cards with front and back printing." },
  { slug: "business-card-400gsm-matt-uv-front-back-round-cut", name: "400 GSM Matt UV F-B Card Round Cut", price: "900", description: "400 GSM matt UV visiting cards with front and back printing and rounded corners." },
];
