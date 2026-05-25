"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface Kanal {
  id: string;
  channelName: string;
  platform: string;
  who: string;
  subscribers: number;
}

interface MaqsadMalumot {
  id?: string;
  targetSubscribers: number;
  targetDate: string;
  mainChannelId: string | null;
  mainChannel?: { id: string; channelName: string; subscribers: number } | null;
}

export default function SozlamalarSahifasi() {
  const [kanallar, setKanallar]       = useState<Kanal[]>([]);
  const [maqsad, setMaqsad]           = useState<MaqsadMalumot | null>(null);
  const [form, setForm]               = useState({
    targetSubscribers: 100000,
    targetDate:        "2026-12-31",
    mainChannelId:     "" as string | null,
  });
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [saqlandi, setSaqlandi]       = useState(false);

  useEffect(() => {
    async function yukla() {
      const [chanR, maqsadR] = await Promise.all([
        fetch(`${API}/api/channels`),
        fetch(`${API}/api/maqsad`),
      ]);
      const chanData = await chanR.json() as Kanal[];
      setKanallar(Array.isArray(chanData) ? chanData : []);

      if (maqsadR.ok) {
        const m = await maqsadR.json() as MaqsadMalumot | null;
        if (m) {
          setMaqsad(m);
          setForm({
            targetSubscribers: m.targetSubscribers,
            targetDate:        m.targetDate.slice(0, 10),
            mainChannelId:     m.mainChannelId ?? "",
          });
        }
      }
    }
    yukla();
  }, []);

  async function saqlash(e: React.FormEvent) {
    e.preventDefault();
    setSaqlanmoqda(true);
    setSaqlandi(false);
    try {
      const r = await fetch(`${API}/api/maqsad`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetSubscribers: form.targetSubscribers,
          targetDate:        new Date(form.targetDate).toISOString(),
          mainChannelId:     form.mainChannelId || null,
        }),
      });
      if (r.ok) {
        const m = await r.json() as MaqsadMalumot;
        setMaqsad(m);
        setSaqlandi(true);
        setTimeout(() => setSaqlandi(false), 3000);
      }
    } finally {
      setSaqlanmoqda(false);
    }
  }

  const menKanallar = kanallar.filter((k) => k.who === "MEN" && k.platform === "YOUTUBE");

  // Joriy maqsad hisoblar
  const joriy     = maqsad?.mainChannel?.subscribers ?? 0;
  const maqsadSon = form.targetSubscribers;
  const foiz      = maqsadSon > 0 ? ((joriy / maqsadSon) * 100).toFixed(1) : "0.0";
  const qolgan    = Math.max(0, Math.ceil((new Date(form.targetDate).getTime() - Date.now()) / 86_400_000));
  const kunlik    = qolgan > 0 ? Math.ceil((maqsadSon - joriy) / qolgan) : 0;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sozlamalar</h1>
        <p className="text-slate-500 mt-1">Maqsad va kuzatuv sozlamalari</p>
      </div>

      {/* Maqsad sozlash */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-800 mb-4">📈 Obunachi maqsadi</h2>
        <form onSubmit={saqlash} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Maqsad obunachilar soni
            </label>
            <input
              type="number"
              min={1}
              value={form.targetSubscribers}
              onChange={(e) => setForm({ ...form, targetSubscribers: parseInt(e.target.value) || 0 })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Maqsad sana
            </label>
            <input
              type="date"
              value={form.targetDate}
              onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Asosiy kanal (obunachilar soni avtomatik olinadi)
            </label>
            <select
              value={form.mainChannelId ?? ""}
              onChange={(e) => setForm({ ...form, mainChannelId: e.target.value || null })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">— Tanlanmagan —</option>
              {menKanallar.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.channelName} ({k.subscribers.toLocaleString()} obunachi)
                </option>
              ))}
            </select>
            {menKanallar.length === 0 && (
              <p className="text-xs text-slate-400 mt-1">
                Avval "Men" kategoriyasida YouTube kanal qo'shing
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={saqlanmoqda}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saqlanmoqda ? "Saqlanmoqda..." : saqlandi ? "✅ Saqlandi!" : "Saqlash"}
          </button>
        </form>
      </div>

      {/* Hozirgi holat */}
      {maqsad && (
        <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-5">
          <h2 className="font-semibold text-indigo-900 mb-3">Hozirgi holat</h2>
          <div className="text-3xl font-bold text-indigo-700 mb-1">
            ⭐ {joriy.toLocaleString()} / {maqsadSon.toLocaleString()}
          </div>
          <div className="w-full h-2 bg-indigo-100 rounded-full mt-2 mb-3">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${Math.min(parseFloat(foiz), 100)}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="text-xl font-bold text-indigo-700">{foiz}%</div>
              <div className="text-indigo-500 text-xs">Maqsaddan</div>
            </div>
            <div>
              <div className="text-xl font-bold text-indigo-700">
                {kunlik > 0 ? kunlik.toLocaleString() : "—"}
              </div>
              <div className="text-indigo-500 text-xs">Kunlik kerak</div>
            </div>
            <div>
              <div className="text-xl font-bold text-indigo-700">{qolgan}</div>
              <div className="text-indigo-500 text-xs">Kun qoldi</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
