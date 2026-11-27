import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Only the public page. API routes are deliberately excluded. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 }];
}
