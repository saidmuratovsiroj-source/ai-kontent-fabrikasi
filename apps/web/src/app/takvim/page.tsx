"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Platform = "YOUTUBE" | "TELEGRAM" | "INSTAGRAM";
type ContentStatus = "REJALASHTIRILGAN" | "TAYYORLANOQDA" | "NASHR_QILINDI" | "BEKOR_QILINDI";

interface ContentPlan {
  id: string;
  title: string;
  platform: Platform;
  plannedDate: string;
  status: ContentStatus;
  runId: string | null;
  run: { id: string; title: string } | null;
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

const STATUS_RANG: Record<ContentStatus, string> = {
  REJALASHTIRILGAN: "bg-slate-100 text-slate-600",
  TAYYORLANOQDA:    "bg-yellow-100 text-yellow-700",
  NASHR_QILINDI:    "bg-green-100 text-green-700",
  BEKOR_QILINDI:    "bg-red-100 text-red-500",
};

const STATUS_LABEL: Record<ContentStatus, string> = {
  REJALASHTIRILGAN: "Rejalashtirilgan",
  TAYYORLANOQDA:    "Tayyorlanmoqda",
  NASHR_QILINDI:    "Nashr qilindi",
  BEKOR_QILINDI:    "Bekor qilindi",
};

const OY_NOMLARI = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];
const KUN_NOMLARI = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

export default function TaqvimSahifasi() {
  const bugun = new Date();
  const [oy, setOy] = useState(bugun.getMonth());
  const [yil, setYil] = useState(bugun.getFullYear());
  const [planlar, setPlanlar] = useState<ContentPlan[]>([]);
  const [yuklanyapti, setYuklanyapti] = useState(true);
  const [formKorinish, setFormKorinish] = useState(false);
  const [tanlanganKun, setTanlanganKun] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", platform: "YOUTUBE" as Platform, plannedDate: "" });
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);

  useEffect(() => { yukla(); }, []);

  async function yukla() {
    setYuklanyapti(true);
    try {
      const r = await fetch(`${API}/api/content-plan`);
      const data = await r.json();
      setPlanlar(Array.isArray(data) ? data : []);
    } finally {
      setYuklanyapti(false);
    }
  }

  async function saqlash(e: React.FormEvent) {
    e.preventDefault();
    setSaqlanmoqda(true);
    try {
      const r = await fetch(`${API}/api/content-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          plannedDate: new Date(form.plannedDate).toISOString(),
        }),
      });
      if (r.ok) {
        await yukla();
        setFormKorinish(false);
        setForm({ title: "", platform: "YOUTUBE", plannedDate: "" });
      }
    } finally {
      setSaqlanmoqda(false);
    }
  }

  async function ochirish(id: string) {
    await fetch(`${API}/api/content-plan/${id}`, { method: "DELETE" });
    setPlanlar((prev) => prev.filter((p) => p.id !== id));
  }

  async function statusniYangilash(id: string, status: ContentStatus) {
    setPlanlar((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    await fetch(`${API}/api/content-plan/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  // Oyning kunlarini hisoblash
  const oyBoshi = new Date(yil, oy, 1);
  const oyOxiri = new Date(yil, oy + 1, 0);
  const boshlanishKuni = (oyBoshi.getDay() + 6) % 7; // Dushanbadan boshlab
  const kunlarSoni = oyOxiri.getDate();

  const kunlar: (number | null)[] = [
    ...Array(boshlanishKuni).fill(null),
    ...Array.from({ length: kunlarSoni }, (_, i) => i + 1),
  ];
  // 6 qatorga to'ldirish
  while (kunlar.length % 7 !== 0) kunlar.push(null);

  function kunPlanlar(kun: number): ContentPlan[] {
    const sanaSatri = `${yil}-${String(oy + 1).padStart(2, "0")}-${String(kun).padStart(2, "0")}`;
    return planlar.filter((p) => p.plannedDate.startsWith(sanaSatri));
  }

  const bugunMi = (kun: number) =>
    yil === bugun.getFullYear() && oy === bugun.getMonth() && kun === bugun.getDate();

  return (
    <div className="flex flex-col h-full">
      {/* Sarlavha */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kontent taqvimi</h1>
          <p className="text-slate-500 mt-1">
            {OY_NOMLARI[oy]} {yil} · {planlar.filter((p) => {
              const d = new Date(p.plannedDate);
              return d.getMonth() === oy && d.getFullYear() === yil;
            }).length} ta kontent rejalashtirilgan
          </p>
        </div>
        <button
          onClick={() => {
            setForm({ title: "", platform: "YOUTUBE", plannedDate: tanlanganKun ?? "" });
            setFormKorinish(true);
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + Kontent qo'shish
        </button>
      </div>

      {/* Navigatsiya */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => { if (oy === 0) { setOy(11); setYil(yil - 1); } else setOy(oy - 1); }}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm hover:bg-slate-50"
        >
          ← Oldingi
        </button>
        <span className="font-semibold text-slate-800 min-w-[140px] text-center">
          {OY_NOMLARI[oy]} {yil}
        </span>
        <button
          onClick={() => { if (oy === 11) { setOy(0); setYil(yil + 1); } else setOy(oy + 1); }}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm hover:bg-slate-50"
        >
          Keyingi →
        </button>
        <button
          onClick={() => { setOy(bugun.getMonth()); setYil(bugun.getFullYear()); }}
          className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm text-slate-600 hover:bg-slate-200 ml-2"
        >
          Bugun
        </button>
      </div>

      {/* Taqvim panjara */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Kun nomlari */}
        <div className="grid grid-cols-7 border-b border-slate-200">
          {KUN_NOMLARI.map((k) => (
            <div key={k} className="text-center text-xs font-semibold text-slate-500 py-2">
              {k}
            </div>
          ))}
        </div>

        {/* Kunlar */}
        {yuklanyapti ? (
          <div className="text-center text-slate-400 py-16">Yuklanmoqda...</div>
        ) : (
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
            {kunlar.map((kun, i) => {
              const kp = kun ? kunPlanlar(kun) : [];
              return (
                <div
                  key={i}
                  onClick={() => {
                    if (!kun) return;
                    const sana = `${yil}-${String(oy + 1).padStart(2, "0")}-${String(kun).padStart(2, "0")}`;
                    setTanlanganKun(sana);
                    setForm({ title: "", platform: "YOUTUBE", plannedDate: sana });
                    setFormKorinish(true);
                  }}
                  className={`min-h-[100px] p-1.5 cursor-pointer transition-colors ${
                    kun ? "hover:bg-indigo-50" : "bg-slate-50 cursor-default"
                  }`}
                >
                  {kun && (
                    <>
                      <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                        bugunMi(kun)
                          ? "bg-indigo-600 text-white"
                          : "text-slate-600"
                      }`}>
                        {kun}
                      </div>
                      <div className="space-y-0.5">
                        {kp.slice(0, 3).map((p) => (
                          <div
                            key={p.id}
                            onClick={(e) => e.stopPropagation()}
                            className={`text-xs px-1.5 py-0.5 rounded truncate ${PLATFORM_RANG[p.platform]}`}
                            title={p.title}
                          >
                            {PLATFORM_EMOJI[p.platform]} {p.title}
                          </div>
                        ))}
                        {kp.length > 3 && (
                          <div className="text-xs text-slate-400">+{kp.length - 3} ta</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pastki ro'yxat */}
      {planlar.length > 0 && (
        <div className="mt-4 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 text-sm font-semibold text-slate-700">
            Barcha rejalar
          </div>
          <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
            {planlar.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLATFORM_RANG[p.platform]}`}>
                  {PLATFORM_EMOJI[p.platform]} {p.platform}
                </span>
                <span className="flex-1 text-sm text-slate-800 truncate">{p.title}</span>
                <span className="text-xs text-slate-400">
                  {new Date(p.plannedDate).toLocaleDateString("uz-UZ")}
                </span>
                <select
                  value={p.status}
                  onChange={(e) => statusniYangilash(p.id, e.target.value as ContentStatus)}
                  onClick={(e) => e.stopPropagation()}
                  className={`text-xs border-0 rounded px-2 py-1 font-medium ${STATUS_RANG[p.status]}`}
                >
                  {(Object.keys(STATUS_LABEL) as ContentStatus[]).map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
                <button
                  onClick={() => ochirish(p.id)}
                  className="text-slate-300 hover:text-red-400 transition-colors text-sm ml-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Yangi kontent qo'shish modali */}
      {formKorinish && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Kontent rejalashtirish</h2>
            <form onSubmit={saqlash} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sarlavha</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Kontent sarlavhasi..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sana</label>
                <input
                  required
                  type="date"
                  value={form.plannedDate}
                  onChange={(e) => setForm({ ...form, plannedDate: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saqlanmoqda}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {saqlanmoqda ? "Saqlanmoqda..." : "Saqlash"}
                </button>
                <button
                  type="button"
                  onClick={() => setFormKorinish(false)}
                  className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Bekor qilish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
