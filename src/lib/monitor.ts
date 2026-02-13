/**
 * Monitor scheduler - runs periodic Lighthouse analysis for monitored sites.
 * Uses node-cron for scheduling.
 */
import type { ScheduledTask } from "node-cron";
import { schedule } from "node-cron";
import { prisma } from "./prisma";
import { analyzeSite } from "./lighthouse-runner";

let monitorTask: ScheduledTask | null = null;

/**
 * Checks all monitored sites and runs analysis if their schedule is due.
 */
async function runMonitorCycle() {
  try {
    const sites = await prisma.site.findMany({
      where: { monitoringEnabled: true },
      include: {
        reports: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    for (const site of sites) {
      const lastReport = site.reports[0];
      const now = new Date();

      if (lastReport) {
        const elapsed = now.getTime() - lastReport.createdAt.getTime();
        const intervalMs = getIntervalMs(site.monitoringFrequency);
        if (elapsed < intervalMs) continue;
      }

      try {
        const result = await analyzeSite(site.url, "mobile");
        if (!result.error) {
          await prisma.report.create({
            data: {
              siteId: site.id,
              performance: result.performance,
              accessibility: result.accessibility,
              bestPractices: result.bestPractices,
              seo: result.seo,
              device: "mobile",
              rawJson: result.rawJson,
            },
          });
        }
      } catch (err) {
        console.error(`Monitor error for ${site.url}:`, err);
      }
    }
  } catch (err) {
    console.error("Monitor cycle error:", err);
  }
}

function getIntervalMs(frequency: string): number {
  switch (frequency) {
    case "6h":
      return 6 * 60 * 60 * 1000;
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    case "24h":
    default:
      return 24 * 60 * 60 * 1000;
  }
}

/**
 * Start the monitor scheduler (runs every hour to check schedules).
 */
export function startMonitor() {
  if (monitorTask) return;
  // Run every hour
  monitorTask = schedule("0 * * * *", runMonitorCycle);
  console.log("Monitor scheduler started");
}

/**
 * Stop the monitor scheduler.
 */
export function stopMonitor() {
  if (monitorTask) {
    monitorTask.stop();
    monitorTask = null;
    console.log("Monitor scheduler stopped");
  }
}
