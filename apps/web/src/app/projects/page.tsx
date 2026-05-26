"use client";

import { useEffect, useState } from "react";
import { useProject, Project } from "@/contexts/ProjectContext";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const EMOJIS = ["📁","🎬","🎯","🚀","💼","🌟","🎨","📱","🔥","💡","🎵","🏆"];

type ProjectWithCount = Project & {
  _count: { runs: number; ideas: number; videoFolders: number };
};

export default function ProjectsPage() {
  const { activeProject, setActiveProject, reloadProjects } = useProject();
  const [projects, setProjects]   = useState<ProjectWithCount[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [name, setName]           = useState("");
  const [emoji, setEmoji]         = useState("📁");
  const [description, setDesc]    = useState("");
  const [saving, setSaving]       = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/projects`);
      setProjects(await r.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditId(null); setName(""); setEmoji("📁"); setDesc(""); setShowForm(true);
  }

  function openEdit(p: ProjectWithCount) {
    setEditId(p.id); setName(p.name); setEmoji(p.emoji); setDesc(p.description ?? ""); setShowForm(true);
  }

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const url    = editId ? `${API}/api/projects/${editId}` : `${API}/api/projects`;
      const method = editId ? "PATCH" : "POST";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), emoji, description: description.trim() || undefined }),
      });
      setShowForm(false);
      await load();
      reloadProjects();
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    if (!confirm("Loyihani o'chirishni tasdiqlaysizmi?")) return;
    await fetch(`${API}/api/projects/${id}`, { method: "DELETE" });
    if (activeProject?.id === id) setActiveProject(null);
    await load();
    reloadProjects();
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Loyihalar</h1>
        <button
          onClick={openNew}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition"
        >
          + Yangi loyiha
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-6">
          <h2 className="text-white font-semibold mb-4">{editId ? "Loyihani tahrirlash" : "Yangi loyiha"}</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`text-xl px-2 py-1 rounded-lg transition ${emoji === e ? "bg-indigo-600" : "bg-gray-700 hover:bg-gray-600"}`}
              >
                {e}
              </button>
            ))}
          </div>
          <input
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 mb-3 outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Loyiha nomi *"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <textarea
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 mb-3 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            placeholder="Tavsif (ixtiyoriy)"
            rows={2}
            value={description}
            onChange={(e) => setDesc(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving || !name.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
            >
              {saving ? "Saqlanmoqda..." : "Saqlash"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition"
            >
              Bekor
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 text-center py-12">Yuklanmoqda...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-3">📁</div>
          <p>Hali loyihalar yo'q. Birinchi loyihani yarating!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div
              key={p.id}
              className={`bg-gray-800 border rounded-xl p-5 flex flex-col gap-3 transition ${
                activeProject?.id === p.id ? "border-indigo-500" : "border-gray-700 hover:border-gray-600"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{p.emoji}</span>
                  <div>
                    <div className="text-white font-semibold">{p.name}</div>
                    {p.description && <div className="text-gray-400 text-xs mt-0.5 line-clamp-1">{p.description}</div>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(p)} className="text-gray-500 hover:text-gray-300 text-sm px-1.5">✏️</button>
                  <button onClick={() => del(p.id)} className="text-gray-500 hover:text-red-400 text-sm px-1.5">🗑</button>
                </div>
              </div>

              <div className="flex gap-3 text-xs text-gray-400">
                <span>🚀 {p._count.runs} yugurish</span>
                <span>💡 {p._count.ideas} ideya</span>
                <span>🗂️ {p._count.videoFolders} video</span>
              </div>

              <button
                onClick={() => setActiveProject(activeProject?.id === p.id ? null : p)}
                className={`text-xs py-1.5 rounded-lg font-medium transition ${
                  activeProject?.id === p.id
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                }`}
              >
                {activeProject?.id === p.id ? "✓ Faol loyiha" : "Tanlash"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
