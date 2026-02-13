import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const sites = await prisma.site.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        reports: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            performance: true,
            accessibility: true,
            bestPractices: true,
            seo: true,
            device: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({
      sites: sites.map((site) => ({
        id: site.id,
        url: site.url,
        monitoringEnabled: site.monitoringEnabled,
        monitoringFrequency: site.monitoringFrequency,
        lastReport: site.reports[0] || null,
      })),
    });
  } catch (err) {
    console.error("Sites API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
