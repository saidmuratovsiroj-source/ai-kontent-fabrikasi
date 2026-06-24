"use client";

import { useEffect, useState, useRef, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// ── Vebinar turlari uchun tayyor konfiguratsiya ─────────────────────────────

const VEBINAR_TURLARI = [
  {
    id:          "ai-kursi",
    nom:         "AI Kursi — O'zimniki",
    tavsif:      "Sun'iy intellekt, kontent yaratish, AI Kontent Fabrikasi",
    kursNomi:    "AI Kontent Master",
    narxi:       "1 500 000 so'm (bo'lib to'lash: oyiga 550 000)",
    davomiyligi: "6 hafta, online format",
    kimlarUchun: "Mobilograflar, SMM mutaxassislari, grafik dizaynerlar, kontent kreatorlar, YouTube uchun kontent qilmoqchi bo'lganlar, AI orqali ishini tezlashtirmoqchi bo'lganlar",
    bonuslar:    "AI Kontent Fabrikasi shabloni, 100+ tayyor promtlar, mijoz topish strategiyalari, Telegram bot darslari, oylik bepul master-klasslar, umrbod kirish",
    telegramLink: "t.me/aipromanager",
  },
  {
    id:          "youtube-kursi",
    nom:         "Amerika YouTube — Sherigim",
    tavsif:      "YouTube, daromad, monetizatsiya — Umrbek Ismailov bilan",
    kursNomi:    "AI Pro — Sun'iy intellekt Masterclass",
    narxi:       "PRO: 1 990 000 so'm | STANDARD: 800 000 so'm | VIP: 4 500 000 so'm",
    davomiyligi: "3 modul: Sun'iy intellekt (15 dars), YouTube (10 dars), Marketing (12 dars)",
    kimlarUchun: "Uy bekalari, talabalar, freelancerlar, YouTube kanal egalari, yosh tadbirkorlar — uydan daromad qilmoqchi bo'lganlar",
    bonuslar:    "100+ tayyor promtlar, jonli haftalik sessiyalar, Telegram chat (savol-javob), umrbod kirish, tayyor shablonlar to'plami",
    telegramLink: "t.me/aipromanager",
  },
] as const;

type VebinarTuriId = typeof VEBINAR_TURLARI[number]["id"];

// ── Typlar ──────────────────────────────────────────────────────────────────

interface RaqibFayl {
  id:        string;
  title:     string;
  source:    string;
  sizeKb:    number;
  chunks:    number;
  createdAt: string;
}

interface AgentQadam {
  agent:   string;
  model:   string;
  chiqish: string;
}

interface GenerateNatija {
  postlar:       string[];
  postTuri:      "progrev" | "daim";
  jadval:        { kun: number; matn: string }[];
  vizualTavsiya: string;
  agentQadamlar: AgentQadam[];
  bazaInfo:      { fayllarSoni: number; yuklanganBelgilar: number; faylNomlar: string[] };
  tokenlar:      { kiruv: number; chiqish: number };
}

// ── Yordamchilar ─────────────────────────────────────────────────────────────

const FILE_EMOJI: Record<string, string> = {
  pdf: "PDF", md: "MD", json: "JSON", txt: "TXT",
};
function fileExt(source: string): string {
  return FILE_EMOJI[source.split(".").pop()?.toLowerCase() ?? ""] ?? "DOC";
}

// ── Asosiy komponent ─────────────────────────────────────────────────────────

export default function VebinarPage() {
  // --- Tanlangan vebinar turi ---
  const [tanlangan, setTanlangan] = useState<VebinarTuriId | null>(null);

  // --- Raqib fayllar ---
  const [raqibFayllar, setRaqibFayllar] = useState<RaqibFayl[]>([]);
  const [uploading,    setUploading]    = useState(false);
  const [uploadXato,   setUploadXato]   = useState<string | null>(null);
  const [uploadOk,     setUploadOk]     = useState(false);
  const [dragging,     setDragging]     = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // --- Form ---
  const [kursNomi,     setKursNomi]     = useState("");
  const [narxi,        setNarxi]        = useState("");
  const [davomiyligi,  setDavomiyligi]  = useState("");
  const [kimlarUchun,  setKimlarUchun]  = useState("");
  const [bonuslar,     setBonuslar]     = useState("");
  const [vebinarSana,  setVebinarSana]  = useState("");
  const [vebinarVaqti, setVebinarVaqti] = useState("20:00");
  const [telegramLink, setTelegramLink] = useState("");
  const [postTuri,     setPostTuri]     = useState<"progrev" | "daim">("progrev");
  const [postSoni,     setPostSoni]     = useState(5);
  const [qoshimcha,    setQoshimcha]    = useState("");

  // --- Natija ---
  const [natija,     setNatija]     = useState<GenerateNatija | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genXato,    setGenXato]    = useState<string | null>(null);
  const [copiedIdx,  setCopiedIdx]  = useState<number | null>(null);
  const [copiedAll,  setCopiedAll]  = useState(false);

  const yuklaRaqibFayllar = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/vebinar/raqib-fayllar`);
      const data = await r.json() as RaqibFayl[];
      setRaqibFayllar(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { void yuklaRaqibFayllar(); }, [yuklaRaqibFayllar]);

  function vebinarTanla(id: VebinarTuriId) {
    setTanlangan(id);
    const config = VEBINAR_TURLARI.find((v) => v.id === id)!;
    setKursNomi(config.kursNomi);
    setNarxi(config.narxi);
    setDavomiyligi(config.davomiyligi);
    setKimlarUchun(config.kimlarUchun);
    setBonuslar(config.bonuslar);
    setTelegramLink(config.telegramLink);
    setNatija(null);
    setGenXato(null);
  }

  async function faylYukla(file: File) {
    setUploading(true);
    setUploadXato(null);
    setUploadOk(false);
    const form = new FormData();
    form.append("file", file);
    form.append("title", file.name.replace(/\.[^.]+$/, ""));
    try {
      const r = await fetch(`${API}/api/vebinar/raqib-yuklash`, { method: "POST", body: form });
      if (!r.ok) {
        const d = await r.json() as { error: string };
        setUploadXato(d.error ?? "Yuklash xatosi");
      } else {
        await yuklaRaqibFayllar();
        setUploadOk(true);
        setTimeout(() => setUploadOk(false), 3000);
      }
    } catch {
      setUploadXato("Server bilan aloqa yo'q");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function faylOchir(id: string) {
    await fetch(`${API}/api/vebinar/raqib-fayllar/${id}`, { method: "DELETE" });
    setRaqibFayllar((prev) => prev.filter((f) => f.id !== id));
  }

  async function generate() {
    if (!kursNomi.trim()) { setGenXato("Kurs nomi majburiy"); return; }
    setGenerating(true);
    setGenXato(null);
    setNatija(null);
    try {
      const r = await fetch(`${API}/api/vebinar/generate`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kursNomi,
          narxi,
          davomiyligi,
          kimlarUchun,
          bonuslar,
          vebinarSana,
          vebinarVaqti,
          telegramLink,
          postTuri,
          postSoni,
          qoshimchaBuyruq: qoshimcha,
        }),
      });
      if (!r.ok) {
        const d = await r.json() as { error: string };
        setGenXato(d.error ?? "Xato yuz berdi");
      } else {
        const data = await r.json() as GenerateNatija;
        setNatija(data);
      }
    } catch {
      setGenXato("Server bilan aloqa yo'q");
    } finally {
      setGenerating(false);
    }
  }

  function postKopir(matn: string, idx: number) {
    void navigator.clipboard.writeText(matn);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  function hammasiniKopir() {
    if (!natija) return;
    const barchasi = natija.jadval
      .map((p) => `POST ${p.kun}\n${"─".repeat(30)}\n${p.matn}`)
      .join("\n\n");
    void navigator.clipboard.writeText(barchasi);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  }

  return (
    <div className="space-y-6 max-w-6xl">

      {/* ── Sarlavha ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Vebinar Kanal Postlari</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Vebinar kanalingiz uchun Telegram postlar — raqib bazasidan olingan, o&apos;z kursingizga moslashtirilgan
        </p>
      </div>

      {/* ── 1-QADAM: Vebinar turini tanlash ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">1-qadam — Qaysi vebinar?</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {VEBINAR_TURLARI.map((v) => (
            <button
              key={v.id}
              onClick={() => vebinarTanla(v.id)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                tanlangan === v.id
                  ? "border-violet-500 bg-violet-50"
                  : "border-slate-200 hover:border-violet-300 hover:bg-slate-50"
              }`}
            >
              <div className={`text-sm font-bold ${tanlangan === v.id ? "text-violet-800" : "text-slate-800"}`}>
                {v.nom}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{v.tavsif}</div>
              {tanlangan === v.id && (
                <div className="text-xs text-violet-600 font-medium mt-1.5">Tanlandi — form to&apos;ldirildi</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Asosiy 2 ustun ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

        {/* ── CHAP: Raqib bazasi (2/5) ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">2-qadam — Raqib bazasi</div>
              <p className="text-xs text-slate-500">
                Raqiblaringizning Telegram postlari, kontent rejalari, vebinar skriptlarini yuklang.
                AI ulardan g&apos;oya olib, SIZNING kursingizga moslashtiradi.
              </p>
            </div>

            {/* Drag-drop */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) void faylYukla(f);
              }}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all select-none ${
                dragging ? "border-violet-400 bg-violet-50" : "border-slate-200 hover:border-violet-300 hover:bg-slate-50"
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,.pdf,.json"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void faylYukla(f); }}
              />
              {uploading ? (
                <div className="text-violet-600 text-xs animate-pulse">Yuklanmoqda...</div>
              ) : uploadOk ? (
                <div className="text-green-700 text-xs font-semibold">Muvaffaqiyatli yuklandi</div>
              ) : (
                <>
                  <div className="text-xs font-semibold text-slate-600">TXT, MD, PDF, JSON</div>
                  <div className="text-xs text-slate-400 mt-0.5">Shu yerga tashlang yoki bosib tanlang</div>
                </>
              )}
            </div>

            {uploadXato && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">{uploadXato}</div>
            )}

            {/* Fayllar ro'yxati */}
            {raqibFayllar.length === 0 ? (
              <div className="text-center py-6 text-slate-300 text-xs">Raqib fayllari yuklanmagan</div>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {raqibFayllar.map((f) => (
                  <div key={f.id} className="flex items-center gap-2.5 group rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors">
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                      {fileExt(f.source)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-700 truncate">{f.title}</div>
                      <div className="text-[10px] text-slate-400">{f.sizeKb.toFixed(1)} KB</div>
                    </div>
                    <button
                      onClick={() => void faylOchir(f.id)}
                      className="text-slate-300 hover:text-red-500 text-base leading-none opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── O'NG: Form + Buyruq (3/5) ── */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">3-qadam — Post sozlamalari va buyruq</div>

            {/* Post turi */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Post turi</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPostTuri("progrev")}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium border transition-all ${
                    postTuri === "progrev"
                      ? "bg-violet-600 text-white border-violet-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"
                  }`}
                >
                  Vebinargacha (isitish)
                </button>
                <button
                  onClick={() => setPostTuri("daim")}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium border transition-all ${
                    postTuri === "daim"
                      ? "bg-violet-600 text-white border-violet-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"
                  }`}
                >
                  Vebinardan keyin (sotuv)
                </button>
              </div>
            </div>

            {/* Post soni */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Post soni: <span className="text-violet-600 font-bold">{postSoni} ta</span>
              </label>
              <div className="flex gap-2">
                {[1, 3, 5, 7, 10, 14].map((n) => (
                  <button
                    key={n}
                    onClick={() => setPostSoni(n)}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      postSoni === n
                        ? "bg-violet-100 text-violet-700 border-violet-300"
                        : "bg-white text-slate-500 border-slate-200 hover:border-violet-200"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Kurs nomi <span className="text-red-400">*</span>
                </label>
                <input
                  value={kursNomi}
                  onChange={(e) => setKursNomi(e.target.value)}
                  placeholder="masalan: AI Kontent Master"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Narxi</label>
                <input
                  value={narxi}
                  onChange={(e) => setNarxi(e.target.value)}
                  placeholder="1 990 000 so'm"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Davomiyligi</label>
                <input
                  value={davomiyligi}
                  onChange={(e) => setDavomiyligi(e.target.value)}
                  placeholder="6 hafta"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Vebinar sanasi</label>
                <input
                  value={vebinarSana}
                  onChange={(e) => setVebinarSana(e.target.value)}
                  placeholder="16-17 iyun 2026"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Vebinar vaqti</label>
                <input
                  value={vebinarVaqti}
                  onChange={(e) => setVebinarVaqti(e.target.value)}
                  placeholder="20:00"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Telegram kanal</label>
                <input
                  value={telegramLink}
                  onChange={(e) => setTelegramLink(e.target.value)}
                  placeholder="t.me/aipromanager"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Kimlar uchun</label>
                <textarea
                  value={kimlarUchun}
                  onChange={(e) => setKimlarUchun(e.target.value)}
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Bonuslar</label>
                <textarea
                  value={bonuslar}
                  onChange={(e) => setBonuslar(e.target.value)}
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
                />
              </div>

              {/* Qo'shimcha buyruq — asosiy narsa */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Qo&apos;shimcha buyruq / ko&apos;rsatma (ixtiyoriy)
                </label>
                <textarea
                  value={qoshimcha}
                  onChange={(e) => setQoshimcha(e.target.value)}
                  rows={3}
                  placeholder={
                    "masalan: \"1-post qo'rquv haqida bo'lsin — pul yo'q deb qo'rqadigan odam uchun\"\n" +
                    "yoki: \"Umrbek bilan birgalikda ishlashimizni ta'kidla\"\n" +
                    "yoki: \"Deadline — 20-iyun kechqurun 23:59 da tugaydi\""
                  }
                  className="w-full border border-violet-200 bg-violet-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none placeholder:text-slate-400"
                />
              </div>
            </div>

            {genXato && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                {genXato}
              </div>
            )}

            <button
              onClick={() => void generate()}
              disabled={generating || !kursNomi.trim()}
              className={`w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all ${
                generating || !kursNomi.trim()
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-100"
              }`}
            >
              {generating
                ? "AI postlar yozmoqda... (30-60 soniya)"
                : `${postSoni} ta Telegram post yaratish`}
            </button>
          </div>
        </div>
      </div>

      {/* ── NATIJALAR ── */}
      {natija && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-base font-bold text-slate-800">
                {natija.postTuri === "progrev" ? "Isitish postlari" : "Sotuv postlari"} — {natija.postlar.length} ta tayyor
              </div>
              <div className="text-xs text-slate-400 mt-0.5 space-y-0.5">
                {natija.bazaInfo.fayllarSoni > 0 ? (
                  <span className="text-green-600 font-medium">
                    Baza: {natija.bazaInfo.fayllarSoni} ta fayl, {Math.round(natija.bazaInfo.yuklanganBelgilar / 1000)}K belgi o&apos;qildi
                  </span>
                ) : (
                  <span className="text-amber-500">Baza fayllari yuklanmagan edi</span>
                )}
                {" — "}
                {natija.tokenlar.kiruv + natija.tokenlar.chiqish} token
              </div>
            </div>
            <button
              onClick={hammasiniKopir}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                copiedAll
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              {copiedAll ? "Hammasini nusxalandi" : "Hammasini nusxalash"}
            </button>
          </div>

          {/* Agent qadamlar — kichik info panel */}
          {natija.agentQadamlar.length > 0 && (
            <details className="border border-slate-100 rounded-xl">
              <summary className="px-4 py-2.5 text-xs font-semibold text-slate-500 cursor-pointer hover:text-slate-700 select-none">
                Agent pipeline ({natija.agentQadamlar.length} qadam)
              </summary>
              <div className="px-4 pb-3 pt-1 space-y-2">
                {natija.agentQadamlar.map((q, i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="font-semibold text-violet-700 whitespace-nowrap w-36 shrink-0">{q.agent}</span>
                    <span className="text-slate-400 font-mono text-[10px] whitespace-nowrap shrink-0">[{q.model}]</span>
                    <span className="text-slate-600 line-clamp-2">{q.chiqish}</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {natija.jadval.map((post) => (
              <PostKarta
                key={post.kun}
                kun={post.kun}
                matn={post.matn}
                postTuri={natija.postTuri}
                copied={copiedIdx === post.kun}
                onCopy={() => postKopir(post.matn, post.kun)}
              />
            ))}
          </div>

          {/* Dizayner vizual tavsiyalari */}
          {natija.vizualTavsiya && (
            <details className="border border-slate-100 rounded-xl">
              <summary className="px-4 py-2.5 text-xs font-semibold text-slate-500 cursor-pointer hover:text-slate-700 select-none">
                Dizayner — vizual tavsiyalar
              </summary>
              <pre className="px-4 pb-4 pt-2 text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">
                {natija.vizualTavsiya}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

// ── Post kartasi ─────────────────────────────────────────────────────────────

function PostKarta({
  kun, matn, postTuri, copied, onCopy,
}: {
  kun:      number;
  matn:     string;
  postTuri: "progrev" | "daim";
  copied:   boolean;
  onCopy:   () => void;
}) {
  const [modal, setModal] = useState(false);

  return (
    <>
      <div className="border border-slate-100 rounded-xl bg-slate-50 hover:bg-white hover:border-slate-300 transition-all group flex flex-col">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-600">
            {postTuri === "progrev" ? `${kun}-kun` : `${kun}-eslatma`}
          </span>
          <button
            onClick={onCopy}
            className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
              copied
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-white text-slate-500 border-slate-200 hover:border-violet-300 hover:text-violet-600 opacity-0 group-hover:opacity-100"
            }`}
          >
            {copied ? "Nusxalandi" : "Nusxalash"}
          </button>
        </div>

        <div className="px-4 py-3 flex-1">
          <p className="text-sm text-slate-700 leading-relaxed line-clamp-10 whitespace-pre-wrap">
            {matn}
          </p>
        </div>

        <button
          onClick={() => setModal(true)}
          className="px-4 py-2 text-xs text-slate-400 hover:text-violet-600 border-t border-slate-100 text-left transition-colors"
        >
          To&apos;liq ko&apos;rish
        </button>
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <span className="font-semibold text-slate-800">
                {postTuri === "progrev" ? `${kun}-kun` : `${kun}-eslatma`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { onCopy(); setModal(false); }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                >
                  Nusxalash
                </button>
                <button
                  onClick={() => setModal(false)}
                  className="text-slate-400 hover:text-slate-700 text-xl font-bold leading-none"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-5 overflow-y-auto">
              <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{matn}</pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
