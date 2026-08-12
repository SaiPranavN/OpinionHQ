import type { MetadataRoute } from "next";

import { absolute } from "@/lib/site";

/**
 * What a crawler may read, and where the map is.
 *
 * Served at /robots.txt. There was no such file until now, which is not the
 * same as "allow everything" in practice: a crawler with no sitemap has to
 * discover every topic and poll by following links from the catalog, and this
 * site had no inbound links at all to start that walk from.
 *
 * The disallows are not secrets — /admin refuses non-editors server-side and
 * every table refuses them again through row policies. They are here because
 * a crawler that fetches them gets a redirect or an empty shell, and spending
 * a new domain's small crawl budget on pages that cannot render is waste.
 *
 * /auth is excluded for a different reason: those URLs carry one-time tokens.
 * Nothing good comes of a crawler following one.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/auth/", "/dashboard"],
      },
    ],
    sitemap: absolute("/sitemap.xml"),
    host: absolute("/"),
  };
}
