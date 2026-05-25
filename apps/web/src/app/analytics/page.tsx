"use client";

import { useEffect, useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface Summary {
  menCount: number;
  raqibCount: number;
  viralCount: number;
  umumiyKorishlar: number;
}

interface ChartChannel {
  channelId:   string;
  channelName: string;
  who:         string;
  data:        { date: string; subscribers: number }[];
}

interface HeatmapData {
  matrix:  number[][];
  maxDay:  number;
  maxHour: number;
}

const KUN_NOMLARI = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
const RANGLAR     = ["#4f46e5", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4"];

function formatRaqam(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function heatRang(val: number, max: number): string {
  if (max === 0 || val === 0) return "#f8fafc";
  const t = val / max;
  const r = 255;
  const g = Math.round(255 - t * 180);
  const b = Math.round(255 - t * 240);
  return `rgb(${r},${g},${b})`;
}

export default function AnalitikaPage() {
  const [period, setPeriod]         = useState(30);
  const [summary, setSummary]       = useState<Summary | null>(null);
  const [chartData, setChartData]   = useState<ChartChannel[]>([]);
  const [heatmap, setHeatmap]       = useState<HeatmapData | null>(null);
  const [svodka, setSvodka]         = useState<string | null>(null);
  const [svodkaYuklanyapti, setSvY] = useState(false);
  const [yuklanyapti, setYuklanyapti] = useState(true);
  const svodkaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/analytics/summary`).then((r) => r.json() as Promise<Summary>),
      fetch(`${API}/api/analytics/heatmap`).then((r) => r.json() as Promise<HeatmapData>),
    ]).then(([s, h]) => {
      setSummary(s);
      setHeatmap(h);
      setYuklanyapti(false);
    });
  }, []);

  useEffect(() => {
    fetch(`${API}/api/analytics/chart?period=${period}`)
      .then((r) => r.json() as Promise<ChartChannel[]>)
      .then(setChartData);
  }, [period]);

  async function svodkaSorash() {
    setSvY(true);
    setSvodka(null);
    try {
      const r = await fetch(`${API}/api/analytics/svodka`, { method: "POST" });
      const d = await r.json() as { report?: string; error?: string };
      setSvodka(d.report ?? d.error ?? "Natija yo'q");
      setTimeout(() => svodkaRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {
      setSvodka("Server bilan aloqa yo'q");
    } finally {
      setSvY(false);
    }
  }

  // Chart.js dataset
  const allDates = [...new Set(chartData.flatMap((c) => c.data.map((d) => d.date)))].sort();
  const lineData = {
    labels:   allDates,
    datasets: chartData.map((ch, i) => ({
      label:           ch.channelName,
      data:            allDates.map((date) => ch.data.find((d) => d.date === date)?.subscribers ?? null),
      borderColor:     RANGLAR[i % RANGLAR.length],
      backgroundColor: ch.who === "MEN" ? RANGLAR[i % RANGLAR.length] + "18" : "transparent",
      borderWidth:     ch.who === "MEN" ? 3 : 1.5,
      borderDash:      ch.who === "RAQIB" ? [4, 3] : [],
      pointRadius:     allDates.length <= 3 ? 5 : 2,
      tension:         0.35,
      spanGaps:        true,
      fill:            ch.who === "MEN",
    })),
  };

  const lineOptions = {
    responsive: true,
    plugins: {
      legend:  { position: "bottom" as const, labels: { font: { size: 12 } } },
      tooltip: { mode: "index" as const, intersect: false },
      title:   { display: false },
    },
    scales: {
      x: { grid: { color: "#f1f5f9" }, ticks: { maxTicksLimit: 8 } },
      y: {
        grid: { color: "#f1f5f9" },
        ticks: { callback: (v: number | string) => formatRaqam(Number(v)) },
      },
    },
  };

  const heatMax = heatmap ? Math.max(...heatmap.matrix.flat()) : 0;

  if (yuklanyapti) return <div className="p-8 text-slate-400">Yuklanmoqda...</div>;

  return (
    <div className="space-y-6">
      {/* Sarlavha */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analitika</h1>
          <p className="text-slate-500 mt-1">Kanallar va raqiblar taqqoslama tahlili</p>
        </div>
        <button
          onClick={svodkaSorash}
          disabled={svodkaYuklanyapti}
          className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center gap-2"
        >
          {svodkaYuklanyapti ? (
            <>
              <span className="animate-spin">⟳</span> Tahlil qilinmoqda...
            </>
          ) : (
            "🤖 Svodka so'rash"
          )}
        </button>
      </div>

      {/* 4 Metrika kartochkasi */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetrikaKarta
            sarlavha="Mening kanallarim"
            qiymat={summary.menCount}
            emoji="📡"
            rang="bg-indigo-50 border-indigo-100"
          />
          <MetrikaKarta
            sarlavha="Raqiblar"
            qiymat={summary.raqibCount}
            emoji="🎯"
            rang="bg-orange-50 border-orange-100"
          />
          <MetrikaKarta
            sarlavha="Viral videolar (30 kun)"
            qiymat={summary.viralCount}
            emoji="🔥"
            rang="bg-red-50 border-red-100"
            izoh="/viral sahifada ko'ring"
          />
          <MetrikaKarta
            sarlavha="Umumiy ko'rishlar"
            qiymat={formatRaqam(summary.umumiyKorishlar)}
            emoji="👁"
            rang="bg-emerald-50 border-emerald-100"
          />
        </div>
      )}

      {/* Solishtirish grafigi */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800">Obunachi dinamikasi</h2>
          <div className="flex gap-2">
            {[30, 90, 365].map((d) => (
              <button
                key={d}
                onClick={() => setPeriod(d)}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                  period === d
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {d === 365 ? "1 yil" : `${d} kun`}
              </button>
            ))}
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="text-center text-slate-400 py-16">
            <div className="text-4xl mb-2">📊</div>
            <div>Hali ma'lumot yo'q. Kanallarni qo'shing va sinxronlang.</div>
          </div>
        ) : (
          <div className="h-72">
            <Line data={lineData} options={lineOptions} />
          </div>
        )}
      </div>

      {/* Issiqliq xaritasi */}
      {heatmap && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-slate-800">Raqiblar faollik vaqti</h2>
            {heatMax > 0 && (
              <span className="text-xs text-slate-500 bg-slate-50 px-3 py-1 rounded-full">
                🔥 Eng faol:{" "}
                <span className="font-medium text-slate-700">
                  {KUN_NOMLARI[heatmap.maxDay]}, {heatmap.maxHour}:00–{heatmap.maxHour + 1}:00
                </span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Ko'rishlar soni — raqiblar qachon video chiqaradi
          </p>

          {heatMax === 0 ? (
            <div className="text-center text-slate-400 py-8 text-sm">
              YouTube API kaliti kerak yoki raqib kanallar yo'q
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="inline-grid gap-px" style={{ gridTemplateColumns: `40px repeat(24, minmax(28px, 1fr))` }}>
                {/* Sarlavha: soatlar */}
                <div />
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="text-center text-[10px] text-slate-400 pb-1">
                    {h % 3 === 0 ? h : ""}
                  </div>
                ))}
                {/* Qatorlar: kunlar */}
                {heatmap.matrix.map((row, dayIdx) => (
                  <>
                    <div key={`d${dayIdx}`} className="text-[11px] text-slate-500 flex items-center pr-1 justify-end">
                      {KUN_NOMLARI[dayIdx]}
                    </div>
                    {row.map((val, hourIdx) => (
                      <div
                        key={`${dayIdx}-${hourIdx}`}
                        title={`${KUN_NOMLARI[dayIdx]}, ${hourIdx}:00 — ${formatRaqam(val)} ko'rish`}
                        className="h-7 rounded-sm cursor-default transition-transform hover:scale-110"
                        style={{ backgroundColor: heatRang(val, heatMax) }}
                      />
                    ))}
                  </>
                ))}
              </div>
              {/* Rang shkala */}
              <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                <span>Kam</span>
                <div className="flex gap-px">
                  {[0, 0.25, 0.5, 0.75, 1].map((t) => (
                    <div
                      key={t}
                      className="w-6 h-3 rounded-sm"
                      style={{ backgroundColor: heatRang(t * heatMax, heatMax) }}
                    />
                  ))}
                </div>
                <span>Ko'p</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Svodka natijasi */}
      {svodka && (
        <div ref={svodkaRef} className="bg-indigo-50 rounded-xl border border-indigo-100 p-5">
          <h2 className="font-semibold text-indigo-900 mb-3">🤖 Raqiblar tahlili</h2>
          <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
            {svodka}
          </div>
        </div>
      )}
    </div>
  );
}

function MetrikaKarta({
  sarlavha,
  qiymat,
  emoji,
  rang,
  izoh,
}: {
  sarlavha: string;
  qiymat: number | string;
  emoji: string;
  rang: string;
  izoh?: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${rang}`}>
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="text-2xl font-bold text-slate-900">{qiymat}</div>
      <div className="text-xs font-medium text-slate-600 mt-0.5">{sarlavha}</div>
      {izoh && <div className="text-[10px] text-slate-400 mt-1">{izoh}</div>}
    </div>
  );
}
