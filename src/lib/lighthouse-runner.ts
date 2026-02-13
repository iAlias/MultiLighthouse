/**
 * Lighthouse runner service.
 * Manages Chrome instances and runs Lighthouse audits with concurrency limiting.
 */
import type { RunnerResult } from "lighthouse";

const MAX_CONCURRENT = 3;
const TIMEOUT_MS = 90_000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2_000;

let activeJobs = 0;
const queue: Array<{
  resolve: (v: LighthouseResult) => void;
  reject: (e: Error) => void;
  url: string;
  device: "mobile" | "desktop";
}> = [];

export interface LighthouseResult {
  url: string;
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  audits: AuditSummary[];
  metrics: MetricsSummary;
  rawJson: string;
  error?: string;
}

export interface AuditSummary {
  id: string;
  title: string;
  description: string;
  score: number | null;
  numericValue?: number;
  displayValue?: string;
  category: string;
  details?: unknown;
}

export interface MetricsSummary {
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  totalBlockingTime?: number;
  cumulativeLayoutShift?: number;
  speedIndex?: number;
  timeToInteractive?: number;
  totalRequestCount?: number;
  totalByteWeight?: number;
}

function extractMetrics(lhr: RunnerResult["lhr"]): MetricsSummary {
  const audits = lhr.audits;
  return {
    firstContentfulPaint: audits["first-contentful-paint"]?.numericValue,
    largestContentfulPaint: audits["largest-contentful-paint"]?.numericValue,
    totalBlockingTime: audits["total-blocking-time"]?.numericValue,
    cumulativeLayoutShift: audits["cumulative-layout-shift"]?.numericValue,
    speedIndex: audits["speed-index"]?.numericValue,
    timeToInteractive: audits["interactive"]?.numericValue,
    totalRequestCount: (
      audits["network-requests"]?.details as { items?: unknown[] }
    )?.items?.length,
    totalByteWeight: audits["total-byte-weight"]?.numericValue,
  };
}

function extractAudits(lhr: RunnerResult["lhr"]): AuditSummary[] {
  const categoryMap: Record<string, string> = {};
  for (const [catId, cat] of Object.entries(lhr.categories)) {
    if (cat.auditRefs) {
      for (const ref of cat.auditRefs) {
        categoryMap[ref.id] = catId;
      }
    }
  }

  return Object.values(lhr.audits)
    .filter(
      (audit) =>
        audit.score !== undefined &&
        audit.score !== null &&
        audit.score < 1
    )
    .map((audit) => ({
      id: audit.id,
      title: audit.title,
      description: audit.description || "",
      score: audit.score,
      numericValue: audit.numericValue,
      displayValue: audit.displayValue,
      category: categoryMap[audit.id] || "other",
      details: audit.details,
    }))
    .sort((a, b) => (a.score ?? 1) - (b.score ?? 1));
}

const TRANSIENT_PATTERNS = [
  "performance mark",
  "econnrefused",
  "econnreset",
  "navigation timeout",
  "target closed",
  "session closed",
  "protocol error",
];

export function isTransientError(message: string): boolean {
  const lower = message.toLowerCase();
  return TRANSIENT_PATTERNS.some((pattern) => lower.includes(pattern));
}

async function runSingleAttempt(
  url: string,
  device: "mobile" | "desktop"
): Promise<LighthouseResult> {
  // Dynamic imports to avoid issues during build
  const lighthouse = (await import("lighthouse")).default;
  const chromeLauncher = await import("chrome-launcher");

  let chrome: Awaited<ReturnType<typeof import("chrome-launcher")["launch"]>> | null = null;

  try {
    chrome = await chromeLauncher.launch({
      chromeFlags: [
        "--headless",
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
      ],
    });

    const options = {
      logLevel: "error" as const,
      output: "json" as const,
      port: chrome.port,
      onlyCategories: [
        "performance",
        "accessibility",
        "best-practices",
        "seo",
      ],
      formFactor: device,
      screenEmulation:
        device === "desktop"
          ? { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false }
          : undefined,
      throttling:
        device === "desktop"
          ? { cpuSlowdownMultiplier: 1, rttMs: 40, throughputKbps: 10240, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 }
          : undefined,
    };

    const result = await Promise.race([
      lighthouse(url, options),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Lighthouse timeout")), TIMEOUT_MS)
      ),
    ]);

    if (!result || !result.lhr) {
      throw new Error("Lighthouse returned no results");
    }

    const lhr = result.lhr;
    const categories = lhr.categories;

    return {
      url,
      performance: Math.round((categories.performance?.score ?? 0) * 100),
      accessibility: Math.round((categories.accessibility?.score ?? 0) * 100),
      bestPractices: Math.round(
        (categories["best-practices"]?.score ?? 0) * 100
      ),
      seo: Math.round((categories.seo?.score ?? 0) * 100),
      audits: extractAudits(lhr),
      metrics: extractMetrics(lhr),
      rawJson: JSON.stringify(lhr),
    };
  } finally {
    if (chrome) {
      try {
        await chrome.kill();
      } catch {
        // Chrome cleanup error - ignore
      }
    }
  }
}

async function runSingle(
  url: string,
  device: "mobile" | "desktop"
): Promise<LighthouseResult> {
  let lastError: string = "Unknown error";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await runSingleAttempt(url, device);
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown error";

      if (attempt < MAX_RETRIES && isTransientError(lastError)) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }

      break;
    }
  }

  return {
    url,
    performance: 0,
    accessibility: 0,
    bestPractices: 0,
    seo: 0,
    audits: [],
    metrics: {},
    rawJson: "{}",
    error: lastError,
  };
}

function processQueue() {
  while (activeJobs < MAX_CONCURRENT && queue.length > 0) {
    const job = queue.shift()!;
    activeJobs++;
    runSingle(job.url, job.device)
      .then(job.resolve)
      .catch(job.reject)
      .finally(() => {
        activeJobs--;
        processQueue();
      });
  }
}

/**
 * Queue a Lighthouse analysis with concurrency limiting.
 */
export function analyzeSite(
  url: string,
  device: "mobile" | "desktop" = "mobile"
): Promise<LighthouseResult> {
  return new Promise((resolve, reject) => {
    queue.push({ resolve, reject, url, device });
    processQueue();
  });
}

/**
 * Analyze multiple sites concurrently (up to MAX_CONCURRENT).
 */
export async function analyzeMultipleSites(
  urls: string[],
  device: "mobile" | "desktop" = "mobile"
): Promise<LighthouseResult[]> {
  const promises = urls.map((url) => analyzeSite(url, device));
  return Promise.all(promises);
}
