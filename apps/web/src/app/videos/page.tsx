"use client";

import { useEffect, useState } from "react";
import { useProject } from "@/contexts/ProjectContext";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface VideoFolder {
  id: string;
  title: string;
  topic: string;
  script: string | null;
  report: string | null;
  thumbnail: string | null;
  plan: string | null;
  projectId: string | null;
  runId: string | null;
  createdAt: string;
}

type Tab = "ssenariy" | "sarlavhalar" | "muqova" | "tadqiqot";

const TAB_LABELS: Record<Tab, string> = {
  ssenariy:   "Ssenariy",
  sarlavhalar: "Sarlavhalar",
  muqova:     "Muqova g'oyalari",
  tadqiqot:   "Tadqiqot",
};

function extractSarlavhalar(thumbnail: string | null): string {
  if (!thumbnail) return "";
  const match = thumbnail.match(/sarlavha[^\n]*\n([\s\S]*?)(?:\n\n|\n[A-Z]|$)/i);
  return match ? match[1] : thumbnail;
}

function extractMuqova(thumbnail: string | null): string {
  if (!thumbnail) return thumbnail ?? "";
  const match = thumbnail.match(/thumbnail konsepsiya[\s\S]*/i);
  return match ? match[0] : thumbnail;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

function FolderDetail({ folder, onClose }: { folder: VideoFolder; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>("ssenariy");
  const [copied, setCopied] = useState(false);

  function getContent(): string {
    switch (activeTab) {
      case "ssenariy":    return folder.script      ?? "Ssenariy mavjud emas";
      case "sarlavhalar": return extractSarlavhalar(folder.thumbnail);
      case "muqova":      return extractMuqova(folder.thumbnail);
      case "tadqiqot":    return folder.report      ?? "Tadqiqot mavjud emas";
    }
  }

  function handleCopy() {
    copyToClipboard(getContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleExport() {
    const blob = new Blob([getContent()], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${folder.title.slice(0, 40)}_${activeTab}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center pt-10 px-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-700 shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">{folder.title}</h2>
            <p className="text-gray-400 text-sm mt-0.5">{folder.topic}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl px-2">✕</button>
        </div>

        {/* Tablar */}
        <div className="flex gap-1 px-5 pt-3 shrink-0">
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${
                activeTab === t
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Kontent */}
        <div className="flex-1 overflow-auto px-5 py-3">
          <pre className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap font-sans">
            {getContent()}
          </pre>
        </div>

        {/* Footer — amallar */}
        <div className="flex gap-2 p-4 border-t border-gray-700 shrink-0">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm transition"
          >
            {copied ? "✓ Nusxalandi!" : "📋 Nusxa olish"}
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm transition"
          >
            💾 .txt yuklab olish
          </button>
          <button
            onClick={() => {
              const all = [
                folder.plan     ? `=== REJA ===\n${folder.plan}`           : "",
                folder.report   ? `=== TADQIQOT ===\n${folder.report}`     : "",
                folder.script   ? `=== SSENARIY ===\n${folder.script}`     : "",
                folder.thumbnail? `=== THUMBNAIL/SARLAVHALAR ===\n${folder.thumbnail}` : "",
              ].filter(Boolean).join("\n\n");
              copyToClipboard(all);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg text-sm transition"
          >
            📤 Hammasini eksport
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VideosPage() {
  const { activeProject }                       = useProject();
  const [folders, setFolders]                   = useState<VideoFolder[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [selected, setSelected]                 = useState<VideoFolder | null>(null);
  const [search, setSearch]                     = useState("");

  async function load() {
    setLoading(true);
    try {
      const q = activeProject ? `?projectId=${activeProject.id}` : "";
      const r = await fetch(`${API}/api/video-folders${q}`);
      setFolders(await r.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [activeProject?.id]);

  async function del(id: string) {
    if (!confirm("Papkani o'chirishni tasdiqlaysizmi?")) return;
    await fetch(`${API}/api/video-folders/${id}`, { method: "DELETE" });
    setFolders((prev) => prev.filter((f) => f.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  async function openDetail(folder: VideoFolder) {
    // To'liq ma'lumotni yuklash (detail endpoint has full content)
    try {
      const r = await fetch(`${API}/api/video-folders/${folder.id}`);
      const full: VideoFolder = await r.json();
      setSelected(full);
    } catch {
      setSelected(folder);
    }
  }

  const filtered = folders.filter((f) =>
    !search || f.title.toLowerCase().includes(search.toLowerCase()) ||
    f.topic.toLowerCase().includes(search.toLowerCase())
  );

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("uz-UZ", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div className="max-w-5xl mx-auto">
      {selected && (
        <FolderDetail
          folder={selected}
          onClose={() => setSelected(null)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Video papkalari</h1>
          {activeProject && (
            <p className="text-gray-400 text-sm mt-0.5">{activeProject.emoji} {activeProject.name}</p>
          )}
        </div>
        <button
          onClick={load}
          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition"
        >
          ↻ Yangilash
        </button>
      </div>

      <input
        className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 mb-5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
        placeholder="Mavzu yoki sarlavha bo'yicha qidirish..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <div className="text-gray-400 text-center py-12">Yuklanmoqda...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-3">🗂️</div>
          <p>
            {search
              ? "Qidiruv bo'yicha natija topilmadi"
              : "Video papkalari hali yo'q. Progon yakunlanganda avtomatik yaratiladi."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((folder) => (
            <div
              key={folder.id}
              className="bg-gray-800 border border-gray-700 hover:border-indigo-600 rounded-xl p-5 flex flex-col gap-3 transition cursor-pointer group"
              onClick={() => openDetail(folder)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-2xl">🗂️</div>
                <button
                  onClick={(e) => { e.stopPropagation(); del(folder.id); }}
                  className="text-gray-600 hover:text-red-400 text-sm opacity-0 group-hover:opacity-100 transition"
                >
                  🗑
                </button>
              </div>

              <div>
                <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2">
                  {folder.title}
                </h3>
                <p className="text-gray-400 text-xs mt-1 line-clamp-1">{folder.topic}</p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {folder.script    && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900 text-blue-300">Ssenariy</span>}
                {folder.thumbnail && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900 text-purple-300">Sarlavha</span>}
                {folder.report    && <span className="text-xs px-2 py-0.5 rounded-full bg-green-900 text-green-300">Tadqiqot</span>}
                {folder.plan      && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900 text-yellow-300">Reja</span>}
              </div>

              <div className="text-gray-500 text-xs mt-auto">{formatDate(folder.createdAt)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
