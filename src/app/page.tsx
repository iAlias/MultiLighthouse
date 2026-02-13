"use client";

import { useState } from "react";
import Link from "next/link";
import ScoreBadge from "@/components/ScoreBadge";

interface AnalysisResult {
  url: string;
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  error?: string;
}

interface SiteRecord {
  id: string;
  url: string;
}

type UrlStatus = "pending" | "running" | "done" | "error";

export default function Home() {
  const [urlInput, setUrlInput] = useState("");
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [siteMap, setSiteMap] = useState<Record<string, SiteRecord>>({});
  const [statuses, setStatuses] = useState<Record<string, UrlStatus>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  async function handleAnalyze() {
    const urls = urlInput
      .split(/[\n,]/)
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urls.length === 0) {
      setError("Please enter at least one URL");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResults([]);
    setSiteMap({});
    setProgress(0);

    // Set all URLs to running
    const initialStatuses: Record<string, UrlStatus> = {};
    urls.forEach((u) => (initialStatuses[u] = "running"));
    setStatuses(initialStatuses);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls, device }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Analysis failed");
        const errorStatuses: Record<string, UrlStatus> = {};
        urls.forEach((u) => (errorStatuses[u] = "error"));
        setStatuses(errorStatuses);
        setIsAnalyzing(false);
        return;
      }

      setResults(data.results || []);
      setProgress(100);

      // Update statuses
      const newStatuses: Record<string, UrlStatus> = {};
      (data.results || []).forEach((r: AnalysisResult) => {
        newStatuses[r.url] = r.error ? "error" : "done";
      });
      setStatuses(newStatuses);

      // Fetch site IDs for linking
      try {
        const sitesRes = await fetch("/api/sites");
        const sitesData = await sitesRes.json();
        const map: Record<string, SiteRecord> = {};
        (sitesData.sites || []).forEach(
          (s: SiteRecord & { lastReport: unknown }) => {
            map[s.url] = { id: s.id, url: s.url };
          }
        );
        setSiteMap(map);
      } catch {
        // Non-critical
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to connect to server"
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  function getStatusIcon(status: UrlStatus) {
    switch (status) {
      case "pending":
        return "⏳";
      case "running":
        return "🔄";
      case "done":
        return "✅";
      case "error":
        return "❌";
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            🔦 Multi Lighthouse Analyzer
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Analyze multiple websites simultaneously with Google Lighthouse
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <div className="mb-4">
            <label
              htmlFor="urls"
              className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
            >
              Enter URLs (one per line)
            </label>
            <textarea
              id="urls"
              className="w-full h-32 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                focus:ring-2 focus:ring-blue-500 focus:border-transparent
                placeholder-gray-400 resize-none"
              placeholder={"https://example.com\nhttps://google.com\nhttps://github.com"}
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              disabled={isAnalyzing}
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Device Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Device:
              </label>
              <select
                value={device}
                onChange={(e) =>
                  setDevice(e.target.value as "mobile" | "desktop")
                }
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                disabled={isAnalyzing}
              >
                <option value="mobile">📱 Mobile</option>
                <option value="desktop">🖥️ Desktop</option>
              </select>
            </div>

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !urlInput.trim()}
              className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg
                hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                transition-colors shadow-md"
            >
              {isAnalyzing ? "Analyzing..." : "🚀 Analyze"}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Progress Bar */}
          {isAnalyzing && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
                <span>Analyzing sites...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 animate-pulse"
                  style={{ width: `${Math.max(progress, 10)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Results Table */}
        {results.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Results
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      URL
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Performance
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Accessibility
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Best Practices
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      SEO
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {results.map((result, i) => {
                    const site = siteMap[result.url];
                    const row = (
                      <tr
                        key={i}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white max-w-xs truncate">
                          {result.url}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <ScoreBadge score={result.performance} />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <ScoreBadge score={result.accessibility} />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <ScoreBadge score={result.bestPractices} />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <ScoreBadge score={result.seo} />
                        </td>
                        <td className="px-6 py-4 text-center text-lg">
                          {getStatusIcon(statuses[result.url] || "done")}
                          {result.error && (
                            <span className="block text-xs text-red-500 mt-1">
                              {result.error}
                            </span>
                          )}
                        </td>
                      </tr>
                    );

                    if (site && !result.error) {
                      return (
                        <Link
                          key={i}
                          href={`/site/${site.id}`}
                          className="contents"
                        >
                          {row}
                        </Link>
                      );
                    }
                    return row;
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
