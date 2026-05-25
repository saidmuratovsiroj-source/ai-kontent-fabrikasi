"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface TrendVideo {
  videoId:      string;
  title:        string;
  channelName:  string;
  publishedAt:  string;
  viewCount:    number;
  thumbnailUrl: string;
}

function formatRaqam(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function sanaDan(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (diff === 0) return "Bugun";
  if (diff === 1) return "Kecha";
  return `${diff} kun oldin`;
}

export default function TrendlarSahifasi() {
  const [trendlar, setTrendlar]     = useState<TrendVideo[]>([]);
  const [yuklanyapti, setYuklanyapti] = useState(true);
  const [days, setDays]             = useState(7);
  const [xato, setXato]             = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    yukla();
  }, [days]);

  async function yukla() {
    setYuklanyapti(true);
    setXato(null);
    try {
      const r = await fetch(`${API}/api/trends?days=${days}`);
      const data = await r.json() as TrendVideo[] | { error: string };
      if (Array.isArray(data)) {
        setTrendlar(data);
      } else {
        setXato(data.error);
      }
    } catch {
      setXato("Server bilan aloqa yo'q");
    } finally {
      setYuklanyapti(false);
    }
  }

  function videoniPipelinesGaYubor(title: string) {
    router.push(`/runs?topic=${encodeURIComponent(title)}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Trendlar</h1>
          <p className="text-slate-500 mt-1">
            AI va texnologiya sohasidagi haftaning eng ko'p ko'rilgan videolari
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                days === d
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {d} kun
            </button>
          ))}
        </div>
      </div>

      {xato && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <span className="font-medium">Diqqat:</span> {xato === "YOUTUBE_API_KEY sozlanmagan"
            ? "YouTube API kaliti sozlanmagan. .env faylida YOUTUBE_API_KEY ni to'ldiring."
            : xato}
        </div>
      )}

      {yuklanyapti ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-slate-100 rounded-xl h-28 animate-pulse" />
          ))}
        </div>
      ) : trendlar.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <div className="text-5xl mb-3">🔍</div>
          <div>Trendlar topilmadi</div>
          <div className="text-xs mt-1">YouTube API kaliti kerak</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trendlar.map((video, idx) => (
            <div
              key={video.videoId}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow flex"
            >
              {/* Raqam */}
              <div className="flex-shrink-0 w-12 flex items-center justify-center bg-slate-50 border-r border-slate-100">
                <span className={`text-lg font-bold ${idx < 3 ? "text-indigo-600" : "text-slate-300"}`}>
                  #{idx + 1}
                </span>
              </div>

              {/* Thumbnail */}
              {video.thumbnailUrl && (
                <div className="flex-shrink-0 w-24 h-full bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Ma'lumot */}
              <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                <div>
                  <a
                    href={`https://youtube.com/watch?v=${video.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-slate-900 hover:text-indigo-600 line-clamp-2 transition-colors"
                  >
                    {video.title}
                  </a>
                  <div className="text-xs text-slate-400 mt-1">
                    {video.channelName} · {sanaDan(video.publishedAt)}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-bold text-slate-700">
                    👁 {formatRaqam(video.viewCount)}
                  </span>
                  <button
                    onClick={() => videoniPipelinesGaYubor(video.title)}
                    className="text-xs px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium transition-colors"
                  >
                    🚀 Video qilish
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
