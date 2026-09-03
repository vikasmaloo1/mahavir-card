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
          "/cart",
          "/checkout",
          "/account",
          "/account/*",
          "/quote",
          "/login",
          "/design-templates",
        ],
      },
    ],
    sitemap: "https://mahavircard.in/sitemap.xml",
  };
}

