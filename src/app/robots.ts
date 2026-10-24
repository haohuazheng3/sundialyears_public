import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/**
 * Crawling is always allowed for public pages (pre-launch pages carry noindex via meta + X-Robots-Tag, which crawlers
 * can only see if they may fetch the page). Admin and API are never crawled.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
