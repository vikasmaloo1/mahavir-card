import type { Metadata } from "next";
import { Archivo, Azeret_Mono, Fraunces } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
  variable: "--font-fraunces",
});

const archivo = Archivo({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-archivo",
});

const azeretMono = Azeret_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-azeret",
});

export const metadata: Metadata = {
  title: "Mahavir Card | Print with confidence",
  description: "Reliable commercial printing, packaging, labels, and branding for growing businesses.",
  icons: {
    icon: [{ url: "/icon.jpeg", type: "image/jpeg" }],
    apple: [{ url: "/apple-icon.jpeg", type: "image/jpeg" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full antialiased ${fraunces.variable} ${archivo.variable} ${azeretMono.variable}`}>
      <body className="mc-grain flex min-h-full flex-col">{children}</body>
    </html>
  );
}
