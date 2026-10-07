import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

// Launch routes are listed statically so the sitemap never depends on the
// database at build time. Add new corridors here when they go live.
const ROUTE_SLUGS = ["dehradun-to-rudraprayag", "rudraprayag-to-dehradun", "dehradun-to-srinagar", "srinagar-to-dehradun"];

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/search", "/routes", "/drive", "/about", "/help", "/contact", "/register", "/terms", "/privacy"];
  return [
    ...pages.map((p) => ({
      url: `${SITE_URL}${p}`,
      changeFrequency: (p === "" || p === "/search" ? "daily" : "monthly") as "daily" | "monthly",
      priority: p === "" ? 1 : 0.6,
    })),
    ...ROUTE_SLUGS.map((s) => ({ url: `${SITE_URL}/routes/${s}`, changeFrequency: "daily" as const, priority: 0.9 })),
  ];
}
