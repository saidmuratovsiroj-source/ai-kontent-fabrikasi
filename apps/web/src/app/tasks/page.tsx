"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type KanbanStatus =
  | "NAVBATDA"
  | "ISHDA"
  | "JAVOB_KUTILMOQDA"
  | "TEKSHIRUVDA"
  | "TASDIQLANGAN"
  | "BEKOR_QILINDI";

interface Vazifa {
  id: string;
  title: string;
  description: string;
  status: string;
  kanbanStatus: KanbanStatus;
  result: string | null;
  createdAt: string;
  run: { id: string; title: string };
  agent: { id: string; name: string };
}

const USTUNLAR: { status: KanbanStatus; label: string; emoji: string; rang: string }[] = [
  { status: "NAVBATDA",          label: "Navbatda",           emoji: "🕐", rang: "border-slate-300 bg-slate-50" },
  { status: "ISHDA",             label: "Ishda",              emoji: "⚡", rang: "border-blue-300 bg-blue-50" },
  { status: "JAVOB_KUTILMOQDA",  label: "Javob kutilmoqda",   emoji: "⏳", rang: "border-yellow-300 bg-yellow-50" },
  { status: "TEKSHIRUVDA",       label: "Tekshiruvda",        emoji: "🔍", rang: "border-purple-300 bg-purple-50" },
  { status: "TASDIQLANGAN",      label: "Tasdiqlangan",       emoji: "✅", rang: "border-green-300 bg-green-50" },
  { status: "BEKOR_QILINDI",     label: "Bekor qilindi",      emoji: "❌", rang: "border-red-300 bg-red-50" },
];

const AGENT_EMOJI: Record<string, string> = {
  Strateg:       "🧠",
  Tadqiqotchi:   "🔬",
  Tanqidchi:     "⚖️",
  Ssenarist:     "✍️",
  Dizayner:      "🎨",
};

export default function VazifalarSahifasi() {
  const [vazifalar, setVazifalar] = useState<Vazifa[]>([]);
  const [yuklanyapti, setYuklanyapti] = useState(true);
  const [korinish, setKorinish] = useState<"kanban" | "royxat">("kanban");
  const [sudrayotgan, setSudrayotgan] = useState<string | null>(null);

  useEffect(() => {
    yukla();
  }, []);

  async function yukla() {
    setYuklanyapti(true);
    try {
      const r = await fetch(`${API}/api/tasks`);
      const data = await r.json();
      setVazifalar(Array.isArray(data) ? data : []);
    } finally {
      setYuklanyapti(false);
    }
  }

  async function statusniYangilash(id: string, yangiStatus: KanbanStatus) {
    setVazifalar((prev) =>
      prev.map((v) => (v.id === id ? { ...v, kanbanStatus: yangiStatus } : v))
    );
    await fetch(`${API}/api/tasks/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kanbanStatus: yangiStatus }),
    });
  }

  function sudraOlish(e: React.DragEvent, id: string) {
    setSudrayotgan(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function ustunGaQoyish(e: React.DragEvent, status: KanbanStatus) {
    e.preventDefault();
    if (sudrayotgan) statusniYangilash(sudrayotgan, status);
    setSudrayotgan(null);
  }

  function ustunUzra(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  if (yuklanyapti) {
    return <div className="p-8 text-slate-500">Yuklanmoqda...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vazifalar taxtasi</h1>
          <p className="text-slate-500 mt-1">
            Jami {vazifalar.length} ta vazifa · sudrab-qo'yib holatini o'zgartiring
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setKorinish("kanban")}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              korinish === "kanban"
                ? "bg-indigo-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            📋 Kanban
          </button>
          <button
            onClick={() => setKorinish("royxat")}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              korinish === "royxat"
                ? "bg-indigo-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            ☰ Ro'yxat
          </button>
        </div>
      </div>

      {korinish === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {USTUNLAR.map((ustun) => {
            const ustunVazifalar = vazifalar.filter((v) => v.kanbanStatus === ustun.status);
            return (
              <div
                key={ustun.status}
                className={`flex-shrink-0 w-64 rounded-xl border-2 ${ustun.rang} flex flex-col`}
                onDragOver={ustunUzra}
                onDrop={(e) => ustunGaQoyish(e, ustun.status)}
              >
                <div className="px-3 py-2.5 border-b border-current border-opacity-20">
                  <span className="font-semibold text-sm text-slate-700">
                    {ustun.emoji} {ustun.label}
                  </span>
                  <span className="ml-2 text-xs bg-white rounded-full px-2 py-0.5 text-slate-500">
                    {ustunVazifalar.length}
                  </span>
                </div>
                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                  {ustunVazifalar.map((v) => (
                    <VazifaKartasi
                      key={v.id}
                      vazifa={v}
                      sudraOlish={sudraOlish}
                      sudrayotgan={sudrayotgan === v.id}
                    />
                  ))}
                  {ustunVazifalar.length === 0 && (
                    <div className="text-center text-slate-400 text-xs py-6">
                      Bu yerga tashlang
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <RoyxatKorinishi vazifalar={vazifalar} statusniYangilash={statusniYangilash} />
      )}
    </div>
  );
}

function VazifaKartasi({
  vazifa,
  sudraOlish,
  sudrayotgan,
}: {
  vazifa: Vazifa;
  sudraOlish: (e: React.DragEvent, id: string) => void;
  sudrayotgan: boolean;
}) {
  const emoji = AGENT_EMOJI[vazifa.agent.name] ?? "🤖";
  return (
    <div
      draggable
      onDragStart={(e) => sudraOlish(e, vazifa.id)}
      className={`bg-white rounded-lg p-3 shadow-sm border border-slate-100 cursor-grab active:cursor-grabbing transition-opacity ${
        sudrayotgan ? "opacity-40" : "opacity-100"
      }`}
    >
      <div className="text-xs text-slate-400 mb-1">
        {emoji} {vazifa.agent.name}
      </div>
      <div className="text-sm font-medium text-slate-800 leading-snug">{vazifa.title}</div>
      <div className="text-xs text-slate-500 mt-1.5 truncate">{vazifa.run.title}</div>
    </div>
  );
}

function RoyxatKorinishi({
  vazifalar,
  statusniYangilash,
}: {
  vazifalar: Vazifa[];
  statusniYangilash: (id: string, status: KanbanStatus) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left px-4 py-3 text-slate-600 font-medium">Vazifa</th>
            <th className="text-left px-4 py-3 text-slate-600 font-medium">Agent</th>
            <th className="text-left px-4 py-3 text-slate-600 font-medium">Yugurish</th>
            <th className="text-left px-4 py-3 text-slate-600 font-medium">Holat</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {vazifalar.map((v) => (
            <tr key={v.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 text-slate-800 font-medium">{v.title}</td>
              <td className="px-4 py-3 text-slate-600">
                {AGENT_EMOJI[v.agent.name] ?? "🤖"} {v.agent.name}
              </td>
              <td className="px-4 py-3 text-slate-500 text-xs">{v.run.title}</td>
              <td className="px-4 py-3">
                <select
                  value={v.kanbanStatus}
                  onChange={(e) => statusniYangilash(v.id, e.target.value as KanbanStatus)}
                  className="text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                >
                  {USTUNLAR.map((u) => (
                    <option key={u.status} value={u.status}>
                      {u.emoji} {u.label}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
          {vazifalar.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center text-slate-400 py-10">
                Hali vazifalar yo'q
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
