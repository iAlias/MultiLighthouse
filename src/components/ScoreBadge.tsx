"use client";

interface ScoreBadgeProps {
  score: number;
}

export default function ScoreBadge({ score }: ScoreBadgeProps) {
  let bgColor = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  if (score >= 90) {
    bgColor = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  } else if (score >= 50) {
    bgColor = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold ${bgColor}`}>
      {score}
    </span>
  );
}
