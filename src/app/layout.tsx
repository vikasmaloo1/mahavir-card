import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://mahavircard.in"),
  title: {
    default: "Mahavir Card | Visiting Card & Offset Printing in Ahmedabad, Gujarat",
    template: "%s | Mahavir Card",
  },
  description: "Business cards, visiting cards, brochures, stickers, letterheads and commercial offset printing from Mahavir Card in Ahmedabad, Gujarat. Live prices, CDR upload, fast turnaround.",
  authors: [{ name: "Mahavir Card", url: "https://mahavircard.in" }],
  creator: "Mahavir Card",
  publisher: "Mahavir Card",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://mahavircard.in",
    siteName: "Mahavir Card",
    title: "Mahavir Card | Visiting Card & Offset Printing in Ahmedabad, Gujarat",
    description: "Business cards, visiting cards, brochures, stickers, letterheads and commercial offset printing from Mahavir Card in Ahmedabad, Gujarat.",
    images: [{ url: "/images/mahavir-print-assortment.png", width: 1200, height: 630, alt: "Mahavir Card — commercial printing in Ahmedabad, Gujarat" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mahavir Card | Offset Printing in Ahmedabad, Gujarat",
    description: "Visiting cards, brochures, stickers, letterheads and commercial printing — live prices, CDR upload.",
    images: ["/images/mahavir-print-assortment.png"],
  },
  icons: {
    icon: [{ url: "/icon.jpeg", type: "image/jpeg" }],
    apple: [{ url: "/apple-icon.jpeg", type: "image/jpeg" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
