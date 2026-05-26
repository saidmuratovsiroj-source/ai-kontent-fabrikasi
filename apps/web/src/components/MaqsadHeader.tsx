"use client";

import { useEffect, useState, useCallback } from "react";
import ProjectBar from "./ProjectBar";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface MaqsadMalumot {
  targetSubscribers: number;
  targetDate: string;
  mainChannel: { subscribers: number; channelName: string } | null;
}

function formatRaqam(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function MaqsadHeader() {
  const [maqsad, setMaqsad] = useState<MaqsadMalumot | null>(null);

  const yukla = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/maqsad`);
      if (r.ok) setMaqsad(await r.json() as MaqsadMalumot | null);
    } catch { /* Backend ishlamasa jim turadi */ }
  }, []);

  useEffect(() => {
    yukla();
    const id = setInterval(yukla, 60_000);
    return () => clearInterval(id);
  }, [yukla]);

  if (!maqsad) {
    return (
      <div className="bg-gray-900 border-b border-gray-800 text-white text-xs px-4 py-1.5 flex items-center justify-end">
        <ProjectBar />
      </div>
    );
  }

  const joriy       = maqsad.mainChannel?.subscribers ?? 0;
  const maqsadSon   = maqsad.targetSubscribers;
  const foiz        = maqsadSon > 0 ? Math.min((joriy / maqsadSon) * 100, 100) : 0;
  const qolganKunMs = new Date(maqsad.targetDate).getTime() - Date.now();
  const qolganKun   = Math.max(0, Math.ceil(qolganKunMs / 86_400_000));
  const kunlikKerak = qolganKun > 0 ? Math.ceil((maqsadSon - joriy) / qolganKun) : 0;

  return (
    <div className="bg-indigo-700 text-white text-xs px-4 py-1.5 flex items-center gap-3 justify-between select-none">
      <div className="flex items-center gap-3">
        <span>⭐</span>
        <span className="font-semibold">
          {formatRaqam(joriy)} / {formatRaqam(maqsadSon)}
        </span>
        <span className="text-indigo-200">|</span>
        <span>{foiz.toFixed(1)}%</span>
        <div className="w-24 h-1.5 bg-indigo-500 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all"
            style={{ width: `${foiz}%` }}
          />
        </div>
        <span className="text-indigo-200">|</span>
        <span>
          {kunlikKerak > 0 ? `${formatRaqam(kunlikKerak)}/kun kerak` : "Maqsadga yetildi 🎉"}
        </span>
        <span className="text-indigo-200">|</span>
        <span>{qolganKun} kun qoldi</span>
      </div>
      <ProjectBar />
    </div>
  );
}
