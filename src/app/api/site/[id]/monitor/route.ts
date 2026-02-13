import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { enabled, frequency } = body as {
      enabled?: boolean;
      frequency?: string;
    };

    const site = await prisma.site.findUnique({ where: { id } });
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const updateData: { monitoringEnabled?: boolean; monitoringFrequency?: string } = {};

    if (typeof enabled === "boolean") {
      updateData.monitoringEnabled = enabled;
    }

    if (frequency && ["6h", "24h", "7d"].includes(frequency)) {
      updateData.monitoringFrequency = frequency;
    }

    const updated = await prisma.site.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      id: updated.id,
      url: updated.url,
      monitoringEnabled: updated.monitoringEnabled,
      monitoringFrequency: updated.monitoringFrequency,
    });
  } catch (err) {
    console.error("Monitor API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
