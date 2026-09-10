import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "mahavircard.in",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/catalogue",
        destination: "/products",
        permanent: true,
      },
      {
        source: "/catalogue/:slug*",
        destination: "/catalog/:slug*",
        permanent: true,
      },
      {
        source: "/catalog/visiting-cards",
        destination: "/products?category=visiting-card",
        permanent: true,
      },
      {
        source: "/catalog/letterheads",
        destination: "/products?category=letterhead-envelope",
        permanent: true,
      },
      {
        source: "/catalog/envelopes",
        destination: "/products?category=letterhead-envelope",
        permanent: true,
      },
      {
        source: "/catalog/brochures",
        destination: "/products?category=brochure",
        permanent: true,
      },
      {
        source: "/catalog/stickers",
        destination: "/products?category=sticker",
        permanent: true,
      },
      {
        source: "/catalog/flyers",
        destination: "/products?category=brochure",
        permanent: true,
      },
      {
        source: "/catalog/cards",
        destination: "/products?category=visiting-card",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
