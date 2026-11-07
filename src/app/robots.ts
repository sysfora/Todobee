import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://todobee.com"
  ).replace(/\/+$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/subscribe", "/accessibility", "/privacy", "/terms", "/security"],
        disallow: [
          "/api/",
          "/dashboard/",
          "/my-tasks/",
          "/projects/",
          "/settings/",
          "/users/",
          "/billing/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
