"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/contexts/ProjectContext";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type IdeaPriority = "YUQORI" | "ORTA" | "PAST";
type IdeaStatus   = "YANGI" | "REJALASHTIRILDI" | "AMALGA_OSHIRILDI";

interface Idea {
  id: string;
  title: string;
  description: string | null;
  platform: string;
  priority: IdeaPriority;
  status: IdeaStatus;
  projectId: string | null;
  createdAt: string;
}

const PRIORITY_LABEL: Record<IdeaPriority, string>  = { YUQORI: "Yuqori", ORTA: "O'rta", PAST: "Past" };
const PRIORITY_COLOR: Record<IdeaPriority, string>  = { YUQORI: "bg-red-900 text-red-300", ORTA: "bg-yellow-900 text-yellow-300", PAST: "bg-gray-700 text-gray-400" };
const STATUS_LABEL:   Record<IdeaStatus, string>    = { YANGI: "Yangi", REJALASHTIRILDI: "Rejalashtirildi", AMALGA_OSHIRILDI: "Amalga oshirildi" };
const STATUS_COLOR:   Record<IdeaStatus, string>    = { YANGI: "bg-blue-900 text-blue-300", REJALASHTIRILDI: "bg-indigo-900 text-indigo-300", AMALGA_OSHIRILDI: "bg-green-900 text-green-300" };

export default function IdeasPage() {
  const router = useRouter();
  const { activeProject } = useProject();
  const [ideas, setIdeas]         = useState<Idea[]>([]);
  const [loading, setLoading]     = useState(true);
  const [title, setTitle]         = useState("");
  const [desc, setDesc]           = useState("");
  const [priority, setPriority]   = useState<IdeaPriority>("ORTA");
  const [platform, setPlatform]   = useState("YOUTUBE");
  const [saving, setSaving]       = useState(false);

  async function load() {
    setLoading(true);
    try {
      const q   = activeProject ? `?projectId=${activeProject.id}` : "";
      const r   = await fetch(`${API}/api/ideas${q}`);
      setIdeas(await r.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [activeProject?.id]);

  async function add() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await fetch(`${API}/api/ideas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: desc.trim() || undefined,
          priority,
          platform,
          projectId: activeProject?.id ?? undefined,
        }),
      });
      setTitle(""); setDesc(""); setPriority("ORTA"); setPlatform("YOUTUBE");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(id: string, status: IdeaStatus) {
    await fetch(`${API}/api/ideas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setIdeas((prev) => prev.map((i) => i.id === id ? { ...i, status } : i));
  }

  async function del(id: string) {
    if (!confirm("Ideyani o'chirishni tasdiqlaysizmi?")) return;
    await fetch(`${API}/api/ideas/${id}`, { method: "DELETE" });
    setIdeas((prev) => prev.filter((i) => i.id !== id));
  }

  function startRun(idea: Idea) {
    router.push(`/runs?topic=${encodeURIComponent(idea.title)}`);
  }

  const byStatus = (s: IdeaStatus) => ideas.filter((i) => i.status === s);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Ideyalar</h1>
          {activeProject && (
            <p className="text-gray-400 text-sm mt-0.5">{activeProject.emoji} {activeProject.name}</p>
          )}
        </div>
      </div>

      {/* Tez qo'shish formasi */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-6">
        <h2 className="text-white font-semibold mb-3">Yangi ideya</h2>
        <input
          className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 mb-3 outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Video mavzusi yoki ideya *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <textarea
          className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 mb-3 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          placeholder="Qo'shimcha izoh (ixtiyoriy)"
          rows={2}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as IdeaPriority)}
            className="bg-gray-700 text-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none"
          >
            <option value="YUQORI">Yuqori muhimlik</option>
            <option value="ORTA">O'rta muhimlik</option>
            <option value="PAST">Past muhimlik</option>
          </select>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="bg-gray-700 text-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none"
          >
            <option value="YOUTUBE">YouTube</option>
            <option value="TELEGRAM">Telegram</option>
            <option value="INSTAGRAM">Instagram</option>
          </select>
          <button
            onClick={add}
            disabled={saving || !title.trim()}
            className="ml-auto px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
          >
            {saving ? "Saqlanmoqda..." : "+ Qo'shish"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-12">Yuklanmoqda...</div>
      ) : ideas.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-3">💡</div>
          <p>Hali ideyalar yo'q. Birinchi ideyani qo'shing!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(["YANGI", "REJALASHTIRILDI", "AMALGA_OSHIRILDI"] as IdeaStatus[]).map((s) => (
            <div key={s}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[s]}`}>
                  {STATUS_LABEL[s]}
                </span>
                <span className="text-gray-500 text-xs">{byStatus(s).length}</span>
              </div>
              <div className="space-y-3">
                {byStatus(s).map((idea) => (
                  <div key={idea.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-white text-sm font-medium leading-snug">{idea.title}</p>
                      <button onClick={() => del(idea.id)} className="text-gray-600 hover:text-red-400 text-xs shrink-0">✕</button>
                    </div>
                    {idea.description && (
                      <p className="text-gray-400 text-xs mb-2 line-clamp-2">{idea.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLOR[idea.priority]}`}>
                        {PRIORITY_LABEL[idea.priority]}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">
                        {idea.platform}
                      </span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {s === "YANGI" && (
                        <button
                          onClick={() => changeStatus(idea.id, "REJALASHTIRILDI")}
                          className="text-xs px-2 py-1 bg-indigo-900 hover:bg-indigo-800 text-indigo-300 rounded-lg transition"
                        >
                          Rejalashtirish
                        </button>
                      )}
                      {s === "REJALASHTIRILDI" && (
                        <button
                          onClick={() => changeStatus(idea.id, "AMALGA_OSHIRILDI")}
                          className="text-xs px-2 py-1 bg-green-900 hover:bg-green-800 text-green-300 rounded-lg transition"
                        >
                          Bajarildi
                        </button>
                      )}
                      {s !== "AMALGA_OSHIRILDI" && (
                        <button
                          onClick={() => startRun(idea)}
                          className="text-xs px-2 py-1 bg-purple-900 hover:bg-purple-800 text-purple-300 rounded-lg transition"
                        >
                          🚀 Progon boshlash
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
