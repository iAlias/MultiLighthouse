import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "30"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    const site = await prisma.site.findUnique({
      where: { id },
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where: { siteId: id },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          performance: true,
          accessibility: true,
          bestPractices: true,
          seo: true,
          device: true,
          createdAt: true,
        },
      }),
      prisma.report.count({ where: { siteId: id } }),
    ]);

    return NextResponse.json({
      site: {
        id: site.id,
        url: site.url,
        monitoringEnabled: site.monitoringEnabled,
        monitoringFrequency: site.monitoringFrequency,
      },
      reports,
      total,
    });
  } catch (err) {
    console.error("Reports API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
