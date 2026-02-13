import { NextRequest, NextResponse } from "next/server";
import { parseUrlList } from "@/lib/url-utils";
import { analyzeMultipleSites } from "@/lib/lighthouse-runner";
import { prisma } from "@/lib/prisma";

const MAX_URLS = 10;

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 5; // 5 requests per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait before trying again." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { urls, device = "mobile" } = body as {
      urls: string[];
      device?: "mobile" | "desktop";
    };

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "Please provide at least one URL" },
        { status: 400 }
      );
    }

    if (urls.length > MAX_URLS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_URLS} URLs allowed per request` },
        { status: 400 }
      );
    }

    if (!["mobile", "desktop"].includes(device)) {
      return NextResponse.json(
        { error: 'Device must be "mobile" or "desktop"' },
        { status: 400 }
      );
    }

    // Validate and deduplicate URLs
    const parsed = parseUrlList(urls.join("\n"));

    if (parsed.valid.length === 0) {
      return NextResponse.json(
        {
          error: "No valid URLs provided",
          invalid: parsed.invalid,
        },
        { status: 400 }
      );
    }

    const validUrls = parsed.valid.map((v) => v.url);

    // Run Lighthouse analyses
    const results = await analyzeMultipleSites(validUrls, device);

    // Save results to database
    for (const result of results) {
      if (!result.error) {
        try {
          const site = await prisma.site.upsert({
            where: { url: result.url },
            create: { url: result.url },
            update: {},
          });

          await prisma.report.create({
            data: {
              siteId: site.id,
              performance: result.performance,
              accessibility: result.accessibility,
              bestPractices: result.bestPractices,
              seo: result.seo,
              device,
              rawJson: result.rawJson,
            },
          });
        } catch (dbErr) {
          console.error("Error saving report:", dbErr);
        }
      }
    }

    return NextResponse.json({
      results: results.map((r) => ({
        url: r.url,
        performance: r.performance,
        accessibility: r.accessibility,
        bestPractices: r.bestPractices,
        seo: r.seo,
        audits: r.audits,
        metrics: r.metrics,
        error: r.error,
      })),
      invalid: parsed.invalid,
    });
  } catch (err) {
    console.error("Analyze API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
