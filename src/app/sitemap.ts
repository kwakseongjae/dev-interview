import type { MetadataRoute } from "next";
import { supabaseAdmin } from "@/lib/supabase";
import { TREND_TOPICS } from "@/data/trend-topics";
import { SITE_URL } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/search`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/interview`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/archive`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/case-studies`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/trends`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/favorites`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/team-spaces/new`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/auth`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.2,
    },
  ];

  // Dynamic: Case study pages
  let caseStudyPages: MetadataRoute.Sitemap = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabaseAdmin as any)
      .from("case_studies")
      .select("slug, updated_at")
      .eq("is_published", true);

    if (data) {
      caseStudyPages = data.map(
        (row: { slug: string; updated_at: string }) => ({
          url: `${SITE_URL}/case-studies/${row.slug}`,
          lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        }),
      );
    }
  } catch {
    // Silently skip if DB unavailable during build
  }

  // Dynamic: Trend topic pages
  const trendPages: MetadataRoute.Sitemap = TREND_TOPICS.map((topic) => ({
    url: `${SITE_URL}/trends?topic=${topic.id}`,
    lastModified: new Date(topic.addedDate),
    changeFrequency: "monthly" as const,
    priority: topic.relevance === "critical" ? 0.7 : 0.6,
  }));

  return [...staticPages, ...caseStudyPages, ...trendPages];
}
