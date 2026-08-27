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

const printOptions = ["Single side", "Both sides"];
const paperOptions = ["Matt", "Gloss", "Natural textured"];

export const catalogCategories = [
  { name: "Business Cards", slug: "business-cards", description: "Visiting card stocks, finishes, and ready-to-order options." },
  { name: "Printing", slug: "printing", description: "Cards, brochures, flyers, and everyday print." },
  { name: "Packaging", slug: "packaging", description: "Boxes, bags, sleeves, and retail-ready packs." },
  { name: "Labels & Stickers", slug: "labels-stickers", description: "Product, bottle, barcode, and shipping labels." },
  { name: "Stationery", slug: "stationery", description: "Letterheads, notebooks, diaries, and registers." },
  { name: "Branding & Signage", slug: "branding-signage", description: "Folders, vinyl, standees, and in-store visibility." },
  { name: "Corporate Gifting", slug: "corporate-gifting", description: "Thoughtful printed kits for teams and clients." },
];

const commonConfiguration: ConfigField[] = [
  { id: "quantity", label: "Quantity", type: "number", defaultValue: "100" },
  { id: "size", label: "Size", type: "select", options: ["Standard", "A5", "A4", "Custom size"], defaultValue: "Standard" },
  { id: "printing", label: "Printing", type: "select", options: printOptions, defaultValue: "Both sides" },
  { id: "paper", label: "Paper", type: "select", options: paperOptions, defaultValue: "Matt" },
];

const productImage = "/images/mahavir-print-assortment.png";

const catalogProductRows: Omit<CatalogProduct, "imageUrl" | "orderable" | "quoteable">[] = [
  { id: "11111111-1111-4111-8111-111111111111", category: "Printing", categorySlug: "printing", name: "Business Cards", slug: "business-cards", shortDescription: "Sharp, memorable cards for everyday introductions.", description: "Choose an approved visiting-card stock and quantity for immediate checkout, or request a quote for a tailored format.", unit: "1,000 cards", turnaround: "2-3 working days", color: "coral", tags: ["Direct order", "Popular"], configuration: [{ id: "quantity", label: "Quantity", type: "number" as const, defaultValue: "1000" }, { id: "specification", label: "Card stock & print", type: "select" as const, options: ["NT single side", "NT front back", "Tearable single side", "Tearable F-B without lamination", "Tearable F-B with lamination", "350 GSM matt single + F-B same rate", "350 GSM matt round cut", "400 GSM matt single side UV card", "400 GSM single side UV card round cut", "400 GSM matt UV F-B card", "400 GSM matt UV F-B card round cut"], defaultValue: "NT single side" }] },
  { id: "22222222-2222-4222-8222-222222222222", category: "Printing", categorySlug: "printing", name: "Brochures", slug: "brochures", shortDescription: "A clear, confident way to explain what you do.", description: "Folded brochures for menus, launches, capabilities, and campaigns with considered paper choices.", unit: "250 copies", turnaround: "3-4 working days", color: "blue", tags: ["Marketing"], configuration: [...commonConfiguration, { id: "fold", label: "Fold", type: "select", options: ["Half fold", "Tri fold", "Gate fold"], defaultValue: "Tri fold" }] },
  { id: "33333333-3333-4333-8333-333333333333", category: "Printing", categorySlug: "printing", name: "Flyers", slug: "flyers", shortDescription: "High-impact handouts for offers and events.", description: "Simple, economical flyers that stay legible from a distance and look good in a hand.", unit: "500 copies", turnaround: "2-3 working days", color: "yellow", tags: ["Value"], configuration: commonConfiguration },
  { id: "44444444-4444-4444-8444-444444444444", category: "Labels & Stickers", categorySlug: "labels-stickers", name: "Product Labels", slug: "product-labels", shortDescription: "Labels that make the shelf do more work.", description: "Custom product labels for jars, boxes, bottles, and packets with durable adhesive options.", unit: "250 labels", turnaround: "4-5 working days", color: "green", tags: ["Product"], configuration: [{ id: "quantity", label: "Quantity", type: "number", defaultValue: "250" }, { id: "size", label: "Size", type: "select", options: ["2 x 2 inch", "3 x 3 inch", "Custom size"], defaultValue: "2 x 2 inch" }, { id: "material", label: "Material", type: "select", options: ["Paper", "Transparent", "Kraft", "Silver foil"], defaultValue: "Paper" }, { id: "finish", label: "Finish", type: "select", options: ["Matt", "Gloss", "Spot UV"], defaultValue: "Matt" }] },
  { id: "55555555-5555-4555-8555-555555555555", category: "Labels & Stickers", categorySlug: "labels-stickers", name: "Barcode Labels", slug: "barcode-labels", shortDescription: "Clean, scan-ready labels for operations.", description: "Reliable barcode and inventory labels for warehouses, retail, and dispatch workflows.", unit: "500 labels", turnaround: "2-3 working days", color: "ink", tags: ["Operations"], configuration: [{ id: "quantity", label: "Quantity", type: "number", defaultValue: "500" }, { id: "size", label: "Size", type: "select", options: ["1 x 1 inch", "2 x 1 inch", "Custom size"], defaultValue: "2 x 1 inch" }, { id: "material", label: "Material", type: "select", options: ["Direct thermal", "Paper", "Polyester"], defaultValue: "Paper" }] },
  { id: "66666666-6666-4666-8666-666666666666", category: "Labels & Stickers", categorySlug: "labels-stickers", name: "Bottle Labels", slug: "bottle-labels", shortDescription: "Water-resistant labels with shelf presence.", description: "Shape-friendly labels for bottles and jars, available in clear, paper, and premium finishes.", unit: "250 labels", turnaround: "4-5 working days", color: "purple", tags: ["Premium"], configuration: [{ id: "quantity", label: "Quantity", type: "number", defaultValue: "250" }, { id: "shape", label: "Shape", type: "select", options: ["Rectangle", "Round", "Custom die cut"], defaultValue: "Rectangle" }, { id: "material", label: "Material", type: "select", options: ["Paper", "Transparent", "Waterproof film"], defaultValue: "Waterproof film" }] },
  { id: "77777777-7777-4777-8777-777777777777", category: "Packaging", categorySlug: "packaging", name: "Packaging Boxes", slug: "packaging-boxes", shortDescription: "A well-made first moment for every product.", description: "Printed folding cartons and rigid-style boxes for products, subscriptions, and gifting.", unit: "100 boxes", turnaround: "7-10 working days", color: "orange", tags: ["Packaging"], configuration: [{ id: "quantity", label: "Quantity", type: "number", defaultValue: "100" }, { id: "size", label: "Size", type: "select", options: ["Small", "Medium", "Large", "Custom size"], defaultValue: "Medium" }, { id: "material", label: "Material", type: "select", options: ["E flute", "Ivory board", "Kraft"], defaultValue: "Ivory board" }, { id: "finish", label: "Finish", type: "select", options: ["Matt", "Gloss", "Embossed"], defaultValue: "Matt" }] },
  { id: "88888888-8888-4888-8888-888888888888", category: "Packaging", categorySlug: "packaging", name: "Paper Bags", slug: "paper-bags", shortDescription: "Carry your brand beyond the counter.", description: "Strong paper bags with twisted handles and clean brand printing for retail and events.", unit: "100 bags", turnaround: "7-8 working days", color: "yellow", tags: ["Retail"], configuration: [{ id: "quantity", label: "Quantity", type: "number", defaultValue: "100" }, { id: "size", label: "Size", type: "select", options: ["Small", "Medium", "Large"], defaultValue: "Medium" }, { id: "paper", label: "Paper", type: "select", options: ["White kraft", "Brown kraft", "Art paper"], defaultValue: "Brown kraft" }, { id: "printing", label: "Printing", type: "select", options: ["Single side", "Both sides"], defaultValue: "Single side" }] },
  { id: "99999999-9999-4999-8999-999999999999", category: "Stationery", categorySlug: "stationery", name: "Letterheads", slug: "letterheads", shortDescription: "Make every official page feel considered.", description: "Letterheads for proposals, invoices, and everyday correspondence in crisp business stock.", unit: "500 sheets", turnaround: "3-4 working days", color: "blue", tags: ["Essential"], configuration: [{ id: "quantity", label: "Quantity", type: "number", defaultValue: "500" }, { id: "size", label: "Size", type: "select", options: ["A4", "A5", "Legal"], defaultValue: "A4" }, { id: "paper", label: "Paper", type: "select", options: ["90 GSM", "100 GSM", "120 GSM"], defaultValue: "100 GSM" }, { id: "printing", label: "Printing", type: "select", options: printOptions, defaultValue: "Single side" }] },
  { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", category: "Stationery", categorySlug: "stationery", name: "Notebooks", slug: "notebooks", shortDescription: "A useful surface for better ideas.", description: "Custom notebooks for teams, workshops, events, and thoughtful client kits.", unit: "50 notebooks", turnaround: "8-10 working days", color: "green", tags: ["Team"], configuration: [{ id: "quantity", label: "Quantity", type: "number", defaultValue: "50" }, { id: "size", label: "Size", type: "select", options: ["A5", "A4", "Pocket"], defaultValue: "A5" }, { id: "binding", label: "Binding", type: "select", options: ["Perfect binding", "Wire-o", "Hardbound"], defaultValue: "Wire-o" }, { id: "paper", label: "Paper", type: "select", options: ["70 GSM", "80 GSM", "100 GSM"], defaultValue: "80 GSM" }] },
  { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", category: "Stationery", categorySlug: "stationery", name: "Diaries", slug: "diaries", shortDescription: "A practical gift people use all year.", description: "Branded diaries with custom covers and interior pages for teams and customers.", unit: "50 diaries", turnaround: "10-12 working days", color: "ink", tags: ["Gifting"], configuration: [{ id: "quantity", label: "Quantity", type: "number", defaultValue: "50" }, { id: "size", label: "Size", type: "select", options: ["A5", "A4"], defaultValue: "A5" }, { id: "binding", label: "Binding", type: "select", options: ["Hardbound", "Wire-o"], defaultValue: "Hardbound" }] },
  { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", category: "Stationery", categorySlug: "stationery", name: "Registers", slug: "registers", shortDescription: "Built for daily records and real work.", description: "Durable registers with strong covers and practical ruling options for offices and schools.", unit: "50 registers", turnaround: "8-10 working days", color: "orange", tags: ["Durable"], configuration: [{ id: "quantity", label: "Quantity", type: "number", defaultValue: "50" }, { id: "size", label: "Size", type: "select", options: ["A4", "A5", "Long book"], defaultValue: "A4" }, { id: "binding", label: "Binding", type: "select", options: ["Hardbound", "Tape bound", "Spiral"], defaultValue: "Hardbound" }] },
  { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", category: "Branding & Signage", categorySlug: "branding-signage", name: "Folders", slug: "folders", shortDescription: "Keep your pitch together, literally.", description: "Presentation folders for proposals, welcome kits, and sales teams.", unit: "100 folders", turnaround: "4-5 working days", color: "coral", tags: ["Sales"], configuration: [{ id: "quantity", label: "Quantity", type: "number", defaultValue: "100" }, { id: "size", label: "Size", type: "select", options: ["A4", "A5"], defaultValue: "A4" }, { id: "finish", label: "Finish", type: "select", options: ["Matt", "Gloss", "Spot UV"], defaultValue: "Matt" }] },
  { id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", category: "Branding & Signage", categorySlug: "branding-signage", name: "Standees", slug: "standees", shortDescription: "Put the message where people can see it.", description: "Portable standees for retail launches, events, reception areas, and promotions.", unit: "1 standee", turnaround: "2-3 working days", color: "blue", tags: ["Events"], configuration: [{ id: "quantity", label: "Quantity", type: "number", defaultValue: "1" }, { id: "size", label: "Size", type: "select", options: ["2 x 5 feet", "2.5 x 6 feet", "Custom size"], defaultValue: "2 x 5 feet" }, { id: "material", label: "Material", type: "select", options: ["Sunboard", "Foam board", "Flex"], defaultValue: "Sunboard" }] },
  { id: "ffffffff-ffff-4fff-8fff-ffffffffffff", category: "Branding & Signage", categorySlug: "branding-signage", name: "Vinyl Graphics", slug: "vinyl-graphics", shortDescription: "Turn a blank surface into a brand surface.", description: "Cut and printed vinyl for windows, walls, vehicles, and point-of-sale spaces.", unit: "10 sq ft", turnaround: "3-4 working days", color: "purple", tags: ["Visibility"], configuration: [{ id: "quantity", label: "Area", type: "number", defaultValue: "10", suffix: "sq ft" }, { id: "material", label: "Material", type: "select", options: ["Gloss vinyl", "Matt vinyl", "Frosted vinyl"], defaultValue: "Matt vinyl" }, { id: "finish", label: "Finish", type: "select", options: ["Indoor", "Outdoor", "Perforated"], defaultValue: "Indoor" }] },
  { id: "12121212-1212-4212-8212-121212121212", category: "Corporate Gifting", categorySlug: "corporate-gifting", name: "Corporate Gift Boxes", slug: "corporate-gift-boxes", shortDescription: "A polished way to say thank you.", description: "Curated printed gift boxes for festivals, milestones, onboarding, and customer appreciation.", unit: "25 boxes", turnaround: "10-12 working days", color: "green", tags: ["Premium", "Seasonal"], configuration: [{ id: "quantity", label: "Quantity", type: "number", defaultValue: "25" }, { id: "size", label: "Size", type: "select", options: ["Small", "Medium", "Large"], defaultValue: "Medium" }, { id: "material", label: "Material", type: "select", options: ["Rigid board", "Kraft", "Corrugated"], defaultValue: "Rigid board" }, { id: "finish", label: "Finish", type: "select", options: ["Matt", "Foil stamp", "Embossed"], defaultValue: "Matt" }] },
];

export const catalogProducts: CatalogProduct[] = catalogProductRows.filter((product) => product.slug !== "business-cards").map((product) => ({
  ...product,
  imageUrl: productImage,
  orderable: product.slug === "business-cards",
  quoteable: true,
}));

export function getCatalogProduct(slug: string) {
  return catalogProducts.find((product) => product.slug === slug);
}
