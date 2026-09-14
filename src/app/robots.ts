import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/*",
          "/api/",
          "/api/*",
          "/api-docs",
          "/cart",
          "/checkout",
          "/account",
          "/account/*",
          "/quote",
          "/login",
          "/design-templates",
          "/terms-and-conditions",
        ],
      },
    ],
    sitemap: "https://mahavircard.in/sitemap.xml",
    host: "https://mahavircard.in",
  };
}
