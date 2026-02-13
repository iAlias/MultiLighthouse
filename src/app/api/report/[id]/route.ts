import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const report = await prisma.report.findUnique({
      where: { id },
      include: { site: true },
    });

    if (!report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    let rawData = {};
    try {
      rawData = JSON.parse(report.rawJson);
    } catch {
      // Invalid JSON - skip
    }

    return NextResponse.json({
      report: {
        id: report.id,
        siteId: report.siteId,
        performance: report.performance,
        accessibility: report.accessibility,
        bestPractices: report.bestPractices,
        seo: report.seo,
        device: report.device,
        createdAt: report.createdAt,
        site: {
          id: report.site.id,
          url: report.site.url,
        },
      },
      rawData,
    });
  } catch (err) {
    console.error("Report API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
