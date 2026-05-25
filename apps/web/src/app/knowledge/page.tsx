"use client";

import { useEffect, useState, useRef, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type KnowledgeType = "HUJJAT" | "RASM" | "STIL_REFERENS";

interface KnowledgeItem {
  id:        string;
  type:      KnowledgeType;
  title:     string;
  source:    string;
  summary:   string | null;
  visibleTo: string[];
  chunks:    number;
  sizeKb:    number;
  createdAt: string;
}

const AGENTLAR = [
  { slug: "ssenarist",    nom: "Ssenarist",    emoji: "✍️" },
  { slug: "dizayner",     nom: "Dizayner",     emoji: "🎨" },
  { slug: "tadqiqotchi",  nom: "Tadqiqotchi",  emoji: "🔬" },
  { slug: "strateg",      nom: "Strateg",      emoji: "🧠" },
  { slug: "tanqidchi",    nom: "Tanqidchi",    emoji: "⚖️" },
];

type TabKey = "hujjatlar" | "rasmlar" | "stil";

const TAB_TYPE: Record<TabKey, KnowledgeType> = {
  hujjatlar: "HUJJAT",
  rasmlar:   "RASM",
  stil:      "STIL_REFERENS",
};

const TAB_ACCEPT: Record<TabKey, string> = {
  hujjatlar: ".txt,.md,.pdf,.json",
  rasmlar:   ".jpg,.jpeg,.png",
  stil:      ".jpg,.jpeg,.png",
};

const FILE_EMOJI: Record<string, string> = {
  pdf:  "📕", md: "📝", json: "🗂️", txt: "📄", jpg: "🖼️", jpeg: "🖼️", png: "🖼️",
};

function fileEmoji(source: string): string {
  const ext = source.split(".").pop()?.toLowerCase() ?? "";
  return FILE_EMOJI[ext] ?? "📄";
}

export default function BilimBazasiPage() {
  const [tab,        setTab]        = useState<TabKey>("hujjatlar");
  const [items,      setItems]      = useState<KnowledgeItem[]>([]);
  const [qidiruv,    setQidiruv]    = useState("");
  const [dragging,   setDragging]   = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [visibleTo,  setVisibleTo]  = useState<string[]>(["ssenarist", "dizayner"]);
  const [xato,       setXato]       = useState<string | null>(null);
  const [yuklandi,   setYuklandi]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const yukla = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/knowledge`);
      const data = await r.json() as KnowledgeItem[];
      setItems(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { yukla(); }, [yukla]);

  const tabItems = items.filter((i) => i.type === TAB_TYPE[tab]);

  const filteredItems = qidiruv.trim()
    ? tabItems.filter((i) =>
        i.title.toLowerCase().includes(qidiruv.toLowerCase()) ||
        (i.summary?.toLowerCase().includes(qidiruv.toLowerCase()) ?? false)
      )
    : tabItems;

  async function fayl_yuklash(file: File) {
    setUploading(true);
    setXato(null);
    setYuklandi(false);

    const form = new FormData();
    form.append("file", file);
    form.append("title", file.name.replace(/\.[^.]+$/, ""));
    form.append("type", TAB_TYPE[tab]);
    visibleTo.forEach((slug) => form.append("visibleTo", slug));

    try {
      const r = await fetch(`${API}/api/knowledge/upload`, { method: "POST", body: form });
      if (!r.ok) {
        const d = await r.json() as { error: string };
        setXato(d.error ?? "Yuklash xatosi");
      } else {
        await yukla();
        setYuklandi(true);
        setTimeout(() => setYuklandi(false), 3000);
      }
    } catch {
      setXato("Server bilan aloqa yo'q");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function ochirish(id: string) {
    await fetch(`${API}/api/knowledge/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function agentToggle(slug: string) {
    setVisibleTo((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  const countOf = (t: KnowledgeType) => items.filter((i) => i.type === t).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bilim bazasi</h1>
        <p className="text-slate-500 mt-1">
          Agentlar uchun hujjatlar, rasmlar va stil referenslari
        </p>
      </div>

      {/* Tablar */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(["hujjatlar", "rasmlar", "stil"] as TabKey[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setQidiruv(""); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              tab === t
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "hujjatlar" ? "📄 Hujjatlar" : t === "rasmlar" ? "🖼️ Muqova fotolari" : "🎨 Stil referenslari"}
            <span className="text-xs bg-slate-200 rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {countOf(TAB_TYPE[t])}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Chap panel: Upload + sozlamalar */}
        <div className="space-y-4">
          {/* Drag-drop zona */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files[0];
              if (f) void fayl_yuklash(f);
            }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all select-none ${
              dragging
                ? "border-indigo-400 bg-indigo-50 scale-[1.01]"
                : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept={TAB_ACCEPT[tab]}
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void fayl_yuklash(f); }}
            />
            {uploading ? (
              <div className="text-indigo-600 font-medium text-sm animate-pulse space-y-1">
                <div className="text-3xl">⏳</div>
                <div>Yuklanmoqda...</div>
                {tab === "hujjatlar" && <div className="text-xs text-slate-400">Xulosa yaratilmoqda</div>}
              </div>
            ) : yuklandi ? (
              <div className="text-green-600 font-medium text-sm space-y-1">
                <div className="text-3xl">✅</div>
                <div>Muvaffaqiyatli yuklandi!</div>
              </div>
            ) : (
              <>
                <div className="text-4xl mb-2">
                  {tab === "hujjatlar" ? "📎" : "🖼️"}
                </div>
                <div className="text-sm font-semibold text-slate-700">
                  {tab === "hujjatlar" ? "TXT, MD, PDF, JSON" : "JPG, PNG"}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Shu yerga tashlang yoki bosib tanlang
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  {tab === "hujjatlar" ? "maks. 50 MB" : "maks. 10 MB"}
                </div>
              </>
            )}
          </div>

          {xato && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {xato}
            </div>
          )}

          {/* Agent ko'rinuvchanligi — faqat Hujjatlar tabida */}
          {tab === "hujjatlar" && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">
                Qaysi agentlarga ko'rinsin?
              </h3>
              <div className="space-y-2.5">
                {AGENTLAR.map((a) => (
                  <label key={a.slug} className="flex items-center gap-2.5 cursor-pointer group">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                      visibleTo.includes(a.slug)
                        ? "bg-indigo-600 border-indigo-600"
                        : "border-slate-300 group-hover:border-indigo-300"
                    }`}>
                      {visibleTo.includes(a.slug) && (
                        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="currentColor">
                          <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                        </svg>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={visibleTo.includes(a.slug)}
                      onChange={() => agentToggle(a.slug)}
                      className="hidden"
                    />
                    <span className="text-sm text-slate-700 group-hover:text-slate-900">
                      {a.emoji} {a.nom}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-3">
                Hech biri tanlanmasa — barcha agentlarga ko'rinadi
              </p>
            </div>
          )}
        </div>

        {/* O'ng panel: Ro'yxat */}
        <div className="lg:col-span-2 space-y-3">
          {/* Qidiruv — faqat Hujjatlar tabida */}
          {tab === "hujjatlar" && (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
              <input
                value={qidiruv}
                onChange={(e) => setQidiruv(e.target.value)}
                placeholder="Qidiruv: masalan 'reels ssenariy'..."
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              {qidiruv && (
                <button
                  onClick={() => setQidiruv("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg"
                >
                  ×
                </button>
              )}
            </div>
          )}

          {/* Hujjatlar */}
          {tab === "hujjatlar" && (
            <HujjatlarRoyxat items={filteredItems} ochirish={ochirish} />
          )}

          {/* Rasmlar */}
          {(tab === "rasmlar" || tab === "stil") && (
            <RasmlarGrid items={filteredItems} ochirish={ochirish} apiUrl={API} />
          )}
        </div>
      </div>
    </div>
  );
}

function HujjatlarRoyxat({
  items,
  ochirish,
}: {
  items: KnowledgeItem[];
  ochirish: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <div className="text-5xl mb-3">📁</div>
        <div>Hujjatlar yuklanmagan</div>
        <div className="text-xs mt-1">Chapdan fayl tashlang</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">Yuklangan hujjatlar</span>
        <span className="text-xs bg-slate-100 rounded-full px-2 py-0.5 text-slate-500">{items.length}</span>
      </div>
      <div className="divide-y divide-slate-50">
        {items.map((item) => (
          <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors flex gap-3 group">
            <div className="flex-shrink-0 text-2xl mt-0.5">{fileEmoji(item.source)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-800 truncate">{item.title}</h3>
                <button
                  onClick={() => ochirish(item.id)}
                  className="flex-shrink-0 text-slate-300 hover:text-red-500 transition-colors text-xl leading-none opacity-0 group-hover:opacity-100"
                  title="O'chirish"
                >
                  ×
                </button>
              </div>
              {item.summary && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {item.summary}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                <span className="text-[10px] text-slate-400">
                  {item.sizeKb.toFixed(1)} KB
                </span>
                {item.chunks > 0 && (
                  <span className="text-[10px] text-slate-400">{item.chunks} bo'lak</span>
                )}
                <span className="text-[10px] text-slate-400">
                  {new Date(item.createdAt).toLocaleDateString("uz-UZ")}
                </span>
                {item.visibleTo.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {item.visibleTo.map((slug) => (
                      <span
                        key={slug}
                        className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full"
                      >
                        {slug}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                    barchaga
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RasmlarGrid({
  items,
  ochirish,
  apiUrl,
}: {
  items:    KnowledgeItem[];
  ochirish: (id: string) => void;
  apiUrl:   string;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <div className="text-5xl mb-3">🖼️</div>
        <div>Rasmlar yuklanmagan</div>
        <div className="text-xs mt-1">Chapdan JPG yoki PNG tashlang</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${apiUrl}/api/knowledge/${item.id}/image`}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors" />
          <button
            onClick={() => ochirish(item.id)}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-opacity shadow"
          >
            ×
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-2 translate-y-full group-hover:translate-y-0 transition-transform">
            <p className="text-white text-xs font-medium truncate">{item.title}</p>
            <p className="text-white/60 text-[10px]">{item.sizeKb.toFixed(1)} KB</p>
          </div>
        </div>
      ))}
    </div>
  );
}
