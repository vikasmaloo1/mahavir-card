import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mahavir Card | Commercial Printing in Ahmedabad, Gujarat",
  description: "Business cards, packaging, labels, stationery and commercial printing from Mahavir Card in Ahmedabad, Gujarat.",
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
