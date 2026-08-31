export type ConfigField = {
  id: string;
  label: string;
  type: "select" | "number" | "text";
  options?: string[];
  defaultValue: string;
  suffix?: string;
};

export type CatalogProduct = {
  id: string;
  category: string;
  categorySlug: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  unit: string;
  turnaround: string;
  color: string;
  tags: string[];
  configuration: ConfigField[];
  imageUrl: string;
  orderable: boolean;
  quoteable: boolean;
};
