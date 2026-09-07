import type { Metadata } from "next";
import "./globals.css";
import { GuidedAssistant } from "@/components/guided-assistant";

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
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Mahavir Card",
  image: "https://mahavircard.in/images/mahavir-print-assortment.png",
  logo: "https://mahavircard.in/icon.png",
  url: "https://mahavircard.in",
  telephone: "+91-94263-71150",
  email: "mahavircard2011@gmail.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Khadia Golwad, Opp. Jain Digamber Mandir",
    addressLocality: "Ahmedabad",
    addressRegion: "Gujarat",
    addressCountry: "IN",
  },
  priceRange: "₹₹",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth">
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon-48x48.png" type="image/png" sizes="48x48" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <GuidedAssistant />
      </body>
    </html>
  );
}
