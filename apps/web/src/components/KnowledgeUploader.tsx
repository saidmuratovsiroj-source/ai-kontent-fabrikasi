"use client";

import { useState, useRef, useEffect } from "react";

type KnowledgeItem = {
  id:        string;
  title:     string;
  source:    string;
  chunks:    number;
  sizeKb:    number;
  createdAt: string;
};

export default function KnowledgeUploader() {
  const [items,     setItems]     = useState<KnowledgeItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging,  setDragging]  = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadItems = async () => {
    try {
      const r = await fetch("/api/knowledge");
      if (r.ok) setItems(await r.json() as KnowledgeItem[]);
    } catch { /* ignore */ }
  };

  useEffect(() => { void loadItems(); }, []);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("title", file.name.replace(/\.[^.]+$/, ""));
    try {
      const r = await fetch("/api/knowledge/upload", { method: "POST", body: form });
      if (!r.ok) {
        const d = await r.json() as { error: string };
        setError(d.error ?? "Yuklash xatosi");
      } else {
        await loadItems();
      }
    } catch {
      setError("Server bilan bog'lanib bo'lmadi");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void uploadFile(file);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors select-none ${
          dragging
            ? "border-indigo-400 bg-indigo-50"
            : "border-slate-300 hover:border-indigo-300 hover:bg-slate-50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadFile(f); }}
        />
        {uploading ? (
          <p className="text-sm text-indigo-600 font-medium animate-pulse">Yuklanmoqda...</p>
        ) : (
          <>
            <p className="text-4xl mb-3">📎</p>
            <p className="text-sm font-semibold text-slate-700">PDF yoki TXT faylini shu yerga tashlang</p>
            <p className="text-xs text-slate-400 mt-1">yoki bosib tanlang &mdash; maks. 20 MB</p>
          </>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Item list */}
      {items.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">
              Yuklangan hujjatlar
            </h3>
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              {items.length}
            </span>
          </div>
          <ul className="divide-y divide-slate-50">
            {items.map((item) => (
              <li key={item.id} className="px-6 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                <span className="text-xl shrink-0">📄</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {item.chunks} bo&apos;lak &middot; {item.sizeKb.toFixed(1)} KB &middot;{" "}
                    {new Date(item.createdAt).toLocaleDateString("uz-UZ")}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); void handleDelete(item.id); }}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-slate-300
                    hover:text-red-500 hover:bg-red-50 transition-colors text-lg font-light"
                  title="O'chirish"
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        !uploading && (
          <p className="text-center text-sm text-slate-400 py-4">
            Hali hech qanday hujjat yuklanmagan
          </p>
        )
      )}
    </div>
  );
}
