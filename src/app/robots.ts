import type { MetadataRoute } from "next";

// Only the public homepage and the auth screens are for crawlers; the panel and API need a session anyway.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/panel", "/api/", "/fis/", "/kurallar"] } };
}
