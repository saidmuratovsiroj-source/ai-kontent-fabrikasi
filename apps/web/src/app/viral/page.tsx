"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface ViralVideo {
  videoId:      string;
  title:        string;
  channelId:    string;
  channelName:  string;
  kanalNomi:    string;
  publishedAt:  string;
  viewCount:    number;
  thumbnailUrl: string;
}

interface Kanal {
  id:          string;
  channelName: string;
  who:         string;
  platform:    string;
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

export default function ViralSahifasi() {
  const [videolar, setVideolar]       = useState<ViralVideo[]>([]);
  const [kanallar, setKanallar]       = useState<Kanal[]>([]);
  const [tanlangan, setTanlangan]     = useState<string>("");
  const [period, setPeriod]           = useState(30);
  const [yuklanyapti, setYuklanyapti] = useState(true);
  const [xato, setXato]               = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch(`${API}/api/channels`)
      .then((r) => r.json() as Promise<Kanal[]>)
      .then((data) => setKanallar(Array.isArray(data) ? data.filter((k) => k.who === "RAQIB" && k.platform === "YOUTUBE") : []));
  }, []);

  useEffect(() => {
    yukla();
  }, [tanlangan, period]);

  async function yukla() {
    setYuklanyapti(true);
    setXato(null);
    try {
      const params = new URLSearchParams({ period: String(period) });
      if (tanlangan) params.set("channelId", tanlangan);
      const r = await fetch(`${API}/api/viral?${params}`);
      const data = await r.json() as ViralVideo[] | { error: string };
      if (Array.isArray(data)) {
        setVideolar(data);
      } else {
        setXato(data.error);
        setVideolar([]);
      }
    } catch {
      setXato("Server bilan aloqa yo'q");
    } finally {
      setYuklanyapti(false);
    }
  }

  function tahlilQilish(title: string) {
    router.push(`/runs?topic=${encodeURIComponent(`"${title}" mavzusini tahlil qil va shu yo'nalishda video ssenariy yoz`)}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Viral videolar</h1>
        <p className="text-slate-500 mt-1">
          Raqiblarning so'nggi kundagi eng ko'p ko'rilgan videolari
        </p>
      </div>

      {/* Filtrlar */}
      <div className="flex flex-wrap gap-3">
        <select
          value={tanlangan}
          onChange={(e) => setTanlangan(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">Barcha raqiblar</option>
          {kanallar.map((k) => (
            <option key={k.id} value={k.id}>{k.channelName}</option>
          ))}
        </select>

        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                period === d
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
          {xato === "YOUTUBE_API_KEY sozlanmagan"
            ? "YouTube API kaliti sozlanmagan. Sozlamalar → .env faylida YOUTUBE_API_KEY ni to'ldiring."
            : xato}
        </div>
      )}

      {yuklanyapti ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-slate-100 rounded-xl h-20 animate-pulse" />
          ))}
        </div>
      ) : videolar.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <div className="text-5xl mb-3">📹</div>
          <div>Viral videolar topilmadi</div>
          <div className="text-xs mt-1">
            {kanallar.length === 0
              ? "Kanallar sahifasida raqib YouTube kanallar qo'shing"
              : "YouTube API kaliti kerak"}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 text-sm text-slate-500">
            {videolar.length} ta video topildi
          </div>
          <div className="divide-y divide-slate-50">
            {videolar.map((video, idx) => (
              <div key={video.videoId} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
                {/* Raqam */}
                <div className={`flex-shrink-0 w-8 text-center font-bold text-lg ${
                  idx < 3 ? "text-red-500" : "text-slate-300"
                }`}>
                  {idx + 1}
                </div>

                {/* Thumbnail */}
                {video.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="flex-shrink-0 w-20 h-12 object-cover rounded-lg bg-slate-100"
                  />
                ) : (
                  <div className="flex-shrink-0 w-20 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-300">
                    ▶
                  </div>
                )}

                {/* Asosiy ma'lumot */}
                <div className="flex-1 min-w-0">
                  <a
                    href={`https://youtube.com/watch?v=${video.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-slate-900 hover:text-indigo-600 text-sm line-clamp-2 transition-colors"
                  >
                    {video.title}
                  </a>
                  <div className="text-xs text-slate-400 mt-0.5">
                    📡 {video.kanalNomi} · {sanaDan(video.publishedAt)}
                  </div>
                </div>

                {/* Ko'rishlar */}
                <div className="flex-shrink-0 text-right">
                  <div className="text-base font-bold text-slate-900">
                    {formatRaqam(video.viewCount)}
                  </div>
                  <div className="text-[10px] text-slate-400">ko'rish</div>
                </div>

                {/* Tahlil tugmasi */}
                <button
                  onClick={() => tahlilQilish(video.title)}
                  className="flex-shrink-0 text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium transition-colors"
                >
                  🔬 Tahlil
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
