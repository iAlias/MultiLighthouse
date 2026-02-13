"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface HistoryChartProps {
  data: Array<{
    date: string;
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  }>;
}

export default function HistoryChart({ data }: HistoryChartProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No historical data available yet.
      </div>
    );
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="performance"
            stroke="#ff6384"
            strokeWidth={2}
            name="Performance"
            dot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="accessibility"
            stroke="#36a2eb"
            strokeWidth={2}
            name="Accessibility"
            dot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="bestPractices"
            stroke="#ffce56"
            strokeWidth={2}
            name="Best Practices"
            dot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="seo"
            stroke="#4bc0c0"
            strokeWidth={2}
            name="SEO"
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
