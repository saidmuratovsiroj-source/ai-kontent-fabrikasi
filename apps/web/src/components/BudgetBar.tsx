"use client";

import { useEffect, useState } from "react";

type BudgetStats = {
  budgetStartUsd:  number;
  totalSpentUsd:   number;
  remainingUsd:    number;
  usedPercent:     number;
  totalOperations: number;
};

export default function BudgetBar({ refreshKey = 0 }: { refreshKey?: number }) {
  const [stats,   setStats]   = useState<BudgetStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/budget")
      .then((r) => r.json())
      .then((d) => setStats(d as BudgetStats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm animate-pulse">
        <div className="h-4 bg-slate-100 rounded w-1/3 mb-3" />
        <div className="h-2.5 bg-slate-100 rounded-full w-full" />
      </div>
    );
  }

  if (!stats) return null;

  const barColor =
    stats.usedPercent >= 80 ? "bg-red-500" :
    stats.usedPercent >= 50 ? "bg-yellow-400" :
    "bg-green-500";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-700">Byudjet</span>
        <span className="text-sm text-slate-500">
          ${stats.totalSpentUsd.toFixed(4)} / ${stats.budgetStartUsd.toFixed(2)}
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(stats.usedPercent, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs text-slate-400">{stats.totalOperations} operatsiya</span>
        <span className={`text-xs font-medium ${stats.usedPercent >= 80 ? "text-red-500" : "text-slate-500"}`}>
          ${stats.remainingUsd.toFixed(4)} qoldi
        </span>
      </div>
    </div>
  );
}
