"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Platform = "YOUTUBE" | "TELEGRAM" | "INSTAGRAM";
type Who = "MEN" | "RAQIB";

interface Kanal {
  id: string;
  platform: Platform;
  channelUrl: string;
  channelName: string;
  who: Who;
  subscribers: number;
  views: number;
  videosCount: number;
  lastSync: string | null;
  createdAt: string;
}

const PLATFORM_EMOJI: Record<Platform, string> = {
  YOUTUBE:   "▶️",
  TELEGRAM:  "✈️",
  INSTAGRAM: "📸",
};

const PLATFORM_RANG: Record<Platform, string> = {
  YOUTUBE:   "bg-red-100 text-red-700",
  TELEGRAM:  "bg-blue-100 text-blue-700",
  INSTAGRAM: "bg-purple-100 text-purple-700",
};

const WHO_RANG: Record<Who, string> = {
  MEN:   "bg-emerald-100 text-emerald-700",
  RAQIB: "bg-orange-100 text-orange-700",
};

function formatRaqam(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const DASTLABKI_FORM = {
  platform:    "YOUTUBE" as Platform,
  who:         "MEN" as Who,
  channelUrl:  "",
  channelName: "",
};

export default function KanallarSahifasi() {
  const [kanallar, setKanallar]         = useState<Kanal[]>([]);
  const [yuklanyapti, setYuklanyapti]   = useState(true);
  const [form, setForm]                 = useState(DASTLABKI_FORM);
  const [tekshirilmoqda, setTeksh]      = useState(false);
  const [qoshilmoqda, setQosh]          = useState(false);
  const [syncId, setSyncId]             = useState<string | null>(null);
  const [xato, setXato]                 = useState<string | null>(null);
  const [oldinKorinish, setOldinKorinish] = useState<Partial<Kanal> | null>(null);

  useEffect(() => { yukla(); }, []);

  async function yukla() {
    setYuklanyapti(true);
    try {
      const r = await fetch(`${API}/api/channels`);
      setKanallar(await r.json() as Kanal[]);
    } finally {
      setYuklanyapti(false);
    }
  }

  async function tekshirish() {
    if (!form.channelUrl.trim()) return;
    setTeksh(true);
    setXato(null);
    setOldinKorinish(null);
    try {
      // Oldindan ko'rish: YouTube API dan ma'lumot olish uchun POST so'rovini yuboring lekin saqlama
      const r = await fetch(`${API}/api/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, _preview: true }),
      });
      if (r.ok) {
        const data = await r.json() as Kanal;
        setOldinKorinish(data);
        setForm((f) => ({ ...f, channelName: data.channelName || f.channelName }));
      } else {
        const err = await r.json() as { error: string };
        setXato(err.error);
      }
    } catch {
      setXato("Server bilan aloqa yo'q");
    } finally {
      setTeksh(false);
    }
  }

  async function qoshish(e: React.FormEvent) {
    e.preventDefault();
    setQosh(true);
    setXato(null);
    try {
      const r = await fetch(`${API}/api/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (r.ok) {
        await yukla();
        setForm(DASTLABKI_FORM);
        setOldinKorinish(null);
      } else {
        const err = await r.json() as { error: string };
        setXato(err.error);
      }
    } catch {
      setXato("Server bilan aloqa yo'q");
    } finally {
      setQosh(false);
    }
  }

  async function sync(id: string) {
    setSyncId(id);
    try {
      const r = await fetch(`${API}/api/channels/${id}/sync`, { method: "POST" });
      if (r.ok) {
        const yangilangan = await r.json() as Kanal;
        setKanallar((prev) => prev.map((k) => (k.id === id ? yangilangan : k)));
      }
    } finally {
      setSyncId(null);
    }
  }

  async function ochirish(id: string) {
    if (!confirm("Kanaloni o'chirishni tasdiqlaysizmi?")) return;
    await fetch(`${API}/api/channels/${id}`, { method: "DELETE" });
    setKanallar((prev) => prev.filter((k) => k.id !== id));
  }

  const menKanallar  = kanallar.filter((k) => k.who === "MEN");
  const raqibKanallar = kanallar.filter((k) => k.who === "RAQIB");

  return (
    <div className="space-y-6">
      {/* Sarlavha */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Kanallar</h1>
        <p className="text-slate-500 mt-1">
          O'z kanallaringiz va raqiblarni kuzating
        </p>
      </div>

      {/* Kanal qo'shish formasi */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Yangi kanal qo'shish</h2>
        <form onSubmit={qoshish} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Kim</label>
              <select
                value={form.who}
                onChange={(e) => setForm({ ...form, who: e.target.value as Who })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="MEN">Men</option>
                <option value="RAQIB">Raqib</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Platforma</label>
              <select
                value={form.platform}
                onChange={(e) => setForm({ ...form, platform: e.target.value as Platform })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="YOUTUBE">▶️ YouTube</option>
                <option value="TELEGRAM">✈️ Telegram</option>
                <option value="INSTAGRAM">📸 Instagram</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              @handle yoki URL
            </label>
            <div className="flex gap-2">
              <input
                required
                value={form.channelUrl}
                onChange={(e) => setForm({ ...form, channelUrl: e.target.value })}
                placeholder={
                  form.platform === "YOUTUBE"
                    ? "@ChannelHandle yoki https://youtube.com/..."
                    : form.platform === "TELEGRAM"
                    ? "@kanal_nomi yoki https://t.me/..."
                    : "@instagram_handle"
                }
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              {form.platform === "YOUTUBE" && (
                <button
                  type="button"
                  onClick={tekshirish}
                  disabled={tekshirilmoqda || !form.channelUrl.trim()}
                  className="px-4 py-2 border border-indigo-300 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-50 disabled:opacity-50 transition-colors"
                >
                  {tekshirilmoqda ? "..." : "Tekshirish"}
                </button>
              )}
            </div>
          </div>

          {form.platform !== "YOUTUBE" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Kanal nomi
              </label>
              <input
                required
                value={form.channelName}
                onChange={(e) => setForm({ ...form, channelName: e.target.value })}
                placeholder="Kanal nomi..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          )}

          {/* Oldindan ko'rish */}
          {oldinKorinish && (
            <div className="bg-indigo-50 rounded-lg p-3 text-sm text-indigo-800 space-y-1">
              <div className="font-semibold">{oldinKorinish.channelName}</div>
              <div className="flex gap-4 text-xs text-indigo-600">
                <span>👥 {formatRaqam(oldinKorinish.subscribers ?? 0)} obunachi</span>
                <span>👁 {formatRaqam(oldinKorinish.views ?? 0)} ko'rish</span>
                <span>🎬 {formatRaqam(oldinKorinish.videosCount ?? 0)} video</span>
              </div>
            </div>
          )}

          {xato && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {xato}
            </div>
          )}

          <button
            type="submit"
            disabled={qoshilmoqda}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {qoshilmoqda ? "Qo'shilmoqda..." : "Qo'shish va sinxronlash"}
          </button>
        </form>
      </div>

      {/* Kanallar jadvali */}
      {!yuklanyapti && kanallar.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 text-sm font-semibold text-slate-700">
            Barcha kanallar ({kanallar.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Kim</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Kanal</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Platforma</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">Obunachilar</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">Ko'rishlar</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">Videolar</th>
                  <th className="text-center px-4 py-3 text-slate-500 font-medium">Sinxronlash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {kanallar.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${WHO_RANG[k.who]}`}>
                        {k.who === "MEN" ? "Men" : "Raqib"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={k.channelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-slate-800 hover:text-indigo-600 transition-colors"
                      >
                        {k.channelName}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${PLATFORM_RANG[k.platform]}`}>
                        {PLATFORM_EMOJI[k.platform]} {k.platform}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      {formatRaqam(k.subscribers)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatRaqam(k.views)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatRaqam(k.videosCount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {k.platform === "YOUTUBE" && (
                          <button
                            onClick={() => sync(k.id)}
                            disabled={syncId === k.id}
                            className="text-xs px-2 py-1 bg-slate-100 rounded hover:bg-indigo-100 hover:text-indigo-700 disabled:opacity-50 transition-colors"
                          >
                            {syncId === k.id ? "..." : "🔄 Sync"}
                          </button>
                        )}
                        <button
                          onClick={() => ochirish(k.id)}
                          className="text-xs px-2 py-1 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Kartochkalar */}
      {!yuklanyapti && (menKanallar.length > 0 || raqibKanallar.length > 0) && (
        <div className="space-y-4">
          {menKanallar.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Mening kanallarim
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {menKanallar.map((k) => (
                  <KanalKartasi key={k.id} kanal={k} sync={sync} syncId={syncId} ochirish={ochirish} />
                ))}
              </div>
            </div>
          )}
          {raqibKanallar.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Raqiblar
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {raqibKanallar.map((k) => (
                  <KanalKartasi key={k.id} kanal={k} sync={sync} syncId={syncId} ochirish={ochirish} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!yuklanyapti && kanallar.length === 0 && (
        <div className="text-center text-slate-400 py-16">
          <div className="text-5xl mb-3">📡</div>
          <div>Hali kanallar qo'shilmagan</div>
        </div>
      )}
    </div>
  );
}

function KanalKartasi({
  kanal,
  sync,
  syncId,
  ochirish,
}: {
  kanal: Kanal;
  sync: (id: string) => void;
  syncId: string | null;
  ochirish: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLATFORM_RANG[kanal.platform]}`}>
            {PLATFORM_EMOJI[kanal.platform]} {kanal.platform}
          </span>
          <a
            href={kanal.channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-1.5 font-semibold text-slate-900 hover:text-indigo-600 truncate transition-colors"
          >
            {kanal.channelName}
          </a>
        </div>
        <button
          onClick={() => ochirish(kanal.id)}
          className="text-slate-300 hover:text-red-400 ml-2 flex-shrink-0 transition-colors"
        >
          ×
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="text-lg font-bold text-slate-900">{formatRaqam(kanal.subscribers)}</div>
          <div className="text-xs text-slate-500">Obunachi</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="text-lg font-bold text-slate-900">{formatRaqam(kanal.views)}</div>
          <div className="text-xs text-slate-500">Ko'rish</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="text-lg font-bold text-slate-900">{formatRaqam(kanal.videosCount)}</div>
          <div className="text-xs text-slate-500">Video</div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-slate-400">
          {kanal.lastSync
            ? `Oxirgi yangilash: ${new Date(kanal.lastSync).toLocaleDateString("uz-UZ")}`
            : "Hali sinxronlanmagan"}
        </span>
        {kanal.platform === "YOUTUBE" && (
          <button
            onClick={() => sync(kanal.id)}
            disabled={syncId === kanal.id}
            className="text-xs px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 disabled:opacity-50 font-medium transition-colors"
          >
            {syncId === kanal.id ? "..." : "🔄 Sync"}
          </button>
        )}
      </div>
    </div>
  );
}
