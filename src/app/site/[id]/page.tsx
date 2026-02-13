"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ScoreCircle from "@/components/ScoreCircle";
import HistoryChart from "@/components/HistoryChart";

interface SiteInfo {
  id: string;
  url: string;
  monitoringEnabled: boolean;
  monitoringFrequency: string;
}

interface ReportSummary {
  id: string;
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  device: string;
  createdAt: string;
}

interface AuditItem {
  id: string;
  title: string;
  description: string;
  score: number | null;
  numericValue?: number;
  displayValue?: string;
  category: string;
}

export default function SiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [audits, setAudits] = useState<AuditItem[]>([]);
  const [activeTab, setActiveTab] = useState<"audits" | "history">("audits");
  const [auditCategory, setAuditCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [monitorSaving, setMonitorSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/site/${id}/reports?limit=50`);
      const data = await res.json();
      setSite(data.site);
      setReports(data.reports || []);

      // Fetch the latest report's full audit data
      if (data.reports && data.reports.length > 0) {
        const reportRes = await fetch(`/api/report/${data.reports[0].id}`);
        const reportData = await reportRes.json();
        if (reportData.rawData?.audits) {
          const auditList: AuditItem[] = [];
          const categoryMap: Record<string, string> = {};

          // Build category map
          if (reportData.rawData.categories) {
            for (const [catId, cat] of Object.entries(
              reportData.rawData.categories as Record<
                string,
                { auditRefs?: { id: string }[] }
              >
            )) {
              if (cat.auditRefs) {
                for (const ref of cat.auditRefs) {
                  categoryMap[ref.id] = catId;
                }
              }
            }
          }

          for (const [auditId, audit] of Object.entries(
            reportData.rawData.audits as Record<
              string,
              {
                title: string;
                description: string;
                score: number | null;
                numericValue?: number;
                displayValue?: string;
              }
            >
          )) {
            if (audit.score !== null && audit.score !== undefined) {
              auditList.push({
                id: auditId,
                title: audit.title,
                description: audit.description || "",
                score: audit.score,
                numericValue: audit.numericValue,
                displayValue: audit.displayValue,
                category: categoryMap[auditId] || "other",
              });
            }
          }

          // Sort: failed first, then by score ascending
          auditList.sort((a, b) => (a.score ?? 1) - (b.score ?? 1));
          setAudits(auditList);
        }
      }
    } catch (err) {
      console.error("Error loading site data:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchData();
  }, [id, fetchData]);

  async function toggleMonitor() {
    if (!site) return;
    setMonitorSaving(true);
    try {
      const res = await fetch(`/api/site/${id}/monitor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !site.monitoringEnabled }),
      });
      const data = await res.json();
      setSite((prev) =>
        prev
          ? { ...prev, monitoringEnabled: data.monitoringEnabled }
          : null
      );
    } catch (err) {
      console.error("Error toggling monitor:", err);
    } finally {
      setMonitorSaving(false);
    }
  }

  async function updateFrequency(frequency: string) {
    if (!site) return;
    try {
      const res = await fetch(`/api/site/${id}/monitor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frequency }),
      });
      const data = await res.json();
      setSite((prev) =>
        prev
          ? { ...prev, monitoringFrequency: data.monitoringFrequency }
          : null
      );
    } catch (err) {
      console.error("Error updating frequency:", err);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-xl text-gray-600 dark:text-gray-300">
          Loading...
        </div>
      </main>
    );
  }

  if (!site) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-xl text-gray-600 dark:text-gray-300">
          Site not found
        </div>
      </main>
    );
  }

  const latestReport = reports[0];
  const previousReport = reports[1];

  // Calculate deltas
  function getDelta(current: number, previous?: number) {
    if (previous === undefined) return null;
    return current - previous;
  }

  // Prepare history chart data
  const chartData = [...reports]
    .reverse()
    .map((r) => ({
      date: new Date(r.createdAt).toLocaleDateString(),
      performance: r.performance,
      accessibility: r.accessibility,
      bestPractices: r.bestPractices,
      seo: r.seo,
    }));

  const filteredAudits =
    auditCategory === "all"
      ? audits
      : audits.filter((a) => a.category === auditCategory);

  const failedAudits = filteredAudits.filter(
    (a) => a.score !== null && a.score < 1
  );
  const passedAudits = filteredAudits.filter(
    (a) => a.score !== null && a.score >= 1
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
        >
          ← Back to Dashboard
        </Link>

        {/* Site Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {site.url}
              </h1>
              {latestReport && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Last analyzed:{" "}
                  {new Date(latestReport.createdAt).toLocaleString()} (
                  {latestReport.device})
                </p>
              )}
            </div>

            {/* Monitor Toggle */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Monitor:
                </label>
                <button
                  onClick={toggleMonitor}
                  disabled={monitorSaving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    site.monitoringEnabled
                      ? "bg-blue-600"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      site.monitoringEnabled
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {site.monitoringEnabled && (
                <select
                  value={site.monitoringFrequency}
                  onChange={(e) => updateFrequency(e.target.value)}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="6h">Every 6 hours</option>
                  <option value="24h">Daily</option>
                  <option value="7d">Weekly</option>
                </select>
              )}
            </div>
          </div>

          {/* Score Circles */}
          {latestReport && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-6 justify-items-center">
              <div className="text-center">
                <ScoreCircle
                  score={latestReport.performance}
                  label="Performance"
                  size={110}
                />
                {previousReport && (
                  <DeltaBadge
                    delta={getDelta(
                      latestReport.performance,
                      previousReport.performance
                    )}
                  />
                )}
              </div>
              <div className="text-center">
                <ScoreCircle
                  score={latestReport.accessibility}
                  label="Accessibility"
                  size={110}
                />
                {previousReport && (
                  <DeltaBadge
                    delta={getDelta(
                      latestReport.accessibility,
                      previousReport.accessibility
                    )}
                  />
                )}
              </div>
              <div className="text-center">
                <ScoreCircle
                  score={latestReport.bestPractices}
                  label="Best Practices"
                  size={110}
                />
                {previousReport && (
                  <DeltaBadge
                    delta={getDelta(
                      latestReport.bestPractices,
                      previousReport.bestPractices
                    )}
                  />
                )}
              </div>
              <div className="text-center">
                <ScoreCircle
                  score={latestReport.seo}
                  label="SEO"
                  size={110}
                />
                {previousReport && (
                  <DeltaBadge
                    delta={getDelta(latestReport.seo, previousReport.seo)}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6">
          <button
            onClick={() => setActiveTab("audits")}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === "audits"
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            Audits & Issues
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === "history"
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            History & Trends
          </button>
        </div>

        {/* Audits Tab */}
        {activeTab === "audits" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { value: "all", label: "All" },
                { value: "performance", label: "Performance" },
                { value: "accessibility", label: "Accessibility" },
                { value: "best-practices", label: "Best Practices" },
                { value: "seo", label: "SEO" },
              ].map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setAuditCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    auditCategory === cat.value
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Failed Audits */}
            {failedAudits.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
                  ❌ Issues & Opportunities ({failedAudits.length})
                </h3>
                <div className="space-y-3">
                  {failedAudits.map((audit) => (
                    <AuditCard key={audit.id} audit={audit} />
                  ))}
                </div>
              </div>
            )}

            {/* Passed Audits */}
            {passedAudits.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-4">
                  ✅ Passed Audits ({passedAudits.length})
                </h3>
                <div className="space-y-2">
                  {passedAudits.map((audit) => (
                    <div
                      key={audit.id}
                      className="py-2 px-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm text-gray-700 dark:text-gray-300"
                    >
                      {audit.title}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {audits.length === 0 && (
              <p className="text-gray-500 text-center py-8">
                No audit data available.
              </p>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Score Trends
            </h3>
            <HistoryChart data={chartData} />

            {/* Reports Table */}
            {reports.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Report History
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Date
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Perf
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          A11y
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          BP
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          SEO
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Device
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {reports.map((report) => (
                        <tr key={report.id}>
                          <td className="px-4 py-2 text-gray-900 dark:text-white">
                            {new Date(report.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-center font-semibold">
                            {report.performance}
                          </td>
                          <td className="px-4 py-2 text-center font-semibold">
                            {report.accessibility}
                          </td>
                          <td className="px-4 py-2 text-center font-semibold">
                            {report.bestPractices}
                          </td>
                          <td className="px-4 py-2 text-center font-semibold">
                            {report.seo}
                          </td>
                          <td className="px-4 py-2 text-center text-gray-500">
                            {report.device}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null || delta === 0) return null;
  const isPositive = delta > 0;
  return (
    <span
      className={`inline-block mt-1 text-xs font-medium ${
        isPositive ? "text-green-600" : "text-red-600"
      }`}
    >
      {isPositive ? "▲" : "▼"} {Math.abs(delta)} pts
    </span>
  );
}

function AuditCard({ audit }: { audit: AuditItem }) {
  const scoreColor =
    audit.score === null || audit.score === 0
      ? "border-red-400"
      : audit.score < 0.5
      ? "border-orange-400"
      : "border-yellow-400";

  return (
    <div
      className={`border-l-4 ${scoreColor} bg-gray-50 dark:bg-gray-700/50 rounded-r-lg p-4`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 dark:text-white text-sm">
            {audit.title}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
            {audit.description.replace(/\[.*?\]\(.*?\)/g, "").slice(0, 200)}
          </p>
        </div>
        <div className="ml-4 flex flex-col items-end">
          {audit.displayValue && (
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {audit.displayValue}
            </span>
          )}
          <span className="text-xs text-gray-400 capitalize">
            {audit.category.replace("-", " ")}
          </span>
        </div>
      </div>
    </div>
  );
}
