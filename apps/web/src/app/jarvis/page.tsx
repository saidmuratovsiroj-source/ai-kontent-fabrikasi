"use client";

import { useState, useRef, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Tab = "chat" | "post" | "goyalar";

interface Xabar {
  rol: "men" | "jarvis";
  matn: string;
  vaqt: string;
}

function hozirgiVaqt() {
  return new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}

const TEZKOR_SAVOLLAR = [
  "Instagram kontent reja tuz",
  "Target reklama uchun maslahat ber",
  "Mijozga professional taklifnoma yoz",
  "SMM narxini qanday belgilash kerak?",
];

export default function JarvisPage() {
  const [tab, setTab] = useState<Tab>("chat");

  const [xabarlar, setXabarlar] = useState<Xabar[]>([
    {
      rol:  "jarvis",
      matn: "Ha, Siroj! Jarvis xizmatingizda. Savol bering, post yozdiring yoki g'oya so'rang.",
      vaqt: hozirgiVaqt(),
    },
  ]);
  const [chatKiruv, setChatKiruv]             = useState("");
  const [chatYuklanyapti, setChatYuklanyapti] = useState(false);
  const [streamingMatn, setStreamingMatn]     = useState<string | null>(null);
  const chatOxiri = useRef<HTMLDivElement>(null);

  const [postMavzu, setPostMavzu]               = useState("");
  const [postMatn, setPostMatn]                 = useState("");
  const [postYuklanyapti, setPostYuklanyapti]   = useState(false);
  const [postKopiyalandi, setPostKopiyalandi]   = useState(false);

  const [goyaMavzu, setGoyaMavzu]               = useState("");
  const [goyaMatn, setGoyaMatn]                 = useState("");
  const [goyaYuklanyapti, setGoyaYuklanyapti]   = useState(false);
  const [goyaKopiyalandi, setGoyaKopiyalandi]   = useState(false);

  useEffect(() => {
    chatOxiri.current?.scrollIntoView({ behavior: "smooth" });
  }, [xabarlar, chatYuklanyapti, streamingMatn]);

  async function chatYuborish(matnKiruv?: string) {
    const matn = (matnKiruv ?? chatKiruv).trim();
    if (!matn || chatYuklanyapti) return;

    const yangiXabarlar: Xabar[] = [
      ...xabarlar,
      { rol: "men", matn, vaqt: hozirgiVaqt() },
    ];
    setXabarlar(yangiXabarlar);
    setChatKiruv("");
    setChatYuklanyapti(true);
    setStreamingMatn(null);

    const tarix = yangiXabarlar.slice(1, -1).map((x) => ({
      role:    x.rol === "men" ? "user" : "assistant",
      content: x.matn,
    }));

    let toplanganMatn = "";

    try {
      const javob = await fetch(`${API}/api/jarvis/chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ xabar: matn, tarix }),
      });

      if (!javob.body) throw new Error("Stream yo'q");

      // Streaming boshlanganda bouncing dots o'rniga matn ko'rsatamiz
      setStreamingMatn("");

      const reader = javob.body.getReader();
      const decoder = new TextDecoder();
      let bufer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        bufer += decoder.decode(value, { stream: true });
        const qatorlar = bufer.split("\n");
        bufer = qatorlar.pop() ?? "";

        for (const qator of qatorlar) {
          if (!qator.startsWith("data: ")) continue;
          try {
            const malumot = JSON.parse(qator.slice(6)) as { matn?: string; done?: boolean; error?: string };
            if (malumot.matn) {
              toplanganMatn += malumot.matn;
              setStreamingMatn(toplanganMatn);
            }
            if (malumot.error) {
              toplanganMatn = malumot.error;
              setStreamingMatn(toplanganMatn);
            }
          } catch { /* noto'g'ri JSON */ }
        }
      }

      // Streaming tugadi — xabarlar ro'yxatiga qo'shamiz
      setXabarlar((prev) => [
        ...prev,
        { rol: "jarvis", matn: toplanganMatn || "...", vaqt: hozirgiVaqt() },
      ]);
      setStreamingMatn(null);
    } catch {
      setXabarlar((prev) => [
        ...prev,
        { rol: "jarvis", matn: "Server bilan bog'lanib bo'lmadi.", vaqt: hozirgiVaqt() },
      ]);
      setStreamingMatn(null);
    } finally {
      setChatYuklanyapti(false);
    }
  }

  function chatTozalash() {
    setXabarlar([{
      rol:  "jarvis",
      matn: "Ha, Siroj! Jarvis xizmatingizda. Savol bering, post yozdiring yoki g'oya so'rang.",
      vaqt: hozirgiVaqt(),
    }]);
    setStreamingMatn(null);
  }

  async function postSorov() {
    if (!postMavzu.trim() || postYuklanyapti) return;
    setPostYuklanyapti(true);
    setPostMatn("");
    setPostKopiyalandi(false);
    try {
      const javob = await fetch(`${API}/api/jarvis/post`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ mavzu: postMavzu }),
      });
      const data = await javob.json() as { post?: string; error?: string };
      setPostMatn(data.post ?? data.error ?? "Xato yuz berdi");
    } catch {
      setPostMatn("Server bilan bog'lanib bo'lmadi.");
    } finally {
      setPostYuklanyapti(false);
    }
  }

  function postYarat(e: React.FormEvent) {
    e.preventDefault();
    void postSorov();
  }

  function postKopiyalash() {
    navigator.clipboard.writeText(postMatn).then(() => {
      setPostKopiyalandi(true);
      setTimeout(() => setPostKopiyalandi(false), 2000);
    });
  }

  async function goyaSorov() {
    if (!goyaMavzu.trim() || goyaYuklanyapti) return;
    setGoyaYuklanyapti(true);
    setGoyaMatn("");
    setGoyaKopiyalandi(false);
    try {
      const javob = await fetch(`${API}/api/jarvis/goyalar`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ mavzu: goyaMavzu }),
      });
      const data = await javob.json() as { goyalar?: string; error?: string };
      setGoyaMatn(data.goyalar ?? data.error ?? "Xato yuz berdi");
    } catch {
      setGoyaMatn("Server bilan bog'lanib bo'lmadi.");
    } finally {
      setGoyaYuklanyapti(false);
    }
  }

  function goyaYarat(e: React.FormEvent) {
    e.preventDefault();
    void goyaSorov();
  }

  function goyaKopiyalash() {
    navigator.clipboard.writeText(goyaMatn).then(() => {
      setGoyaKopiyalandi(true);
      setTimeout(() => setGoyaKopiyalandi(false), 2000);
    });
  }

  return (
    <div className="flex h-full bg-zinc-950 text-white overflow-hidden">

      {/* ── Chap panel ──────────────────────────────────────────────────── */}
      <div className="w-64 shrink-0 flex flex-col border-r border-white/5 bg-zinc-900">

        {/* Avatar blok */}
        <div className="flex flex-col items-center px-6 pt-8 pb-6">
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-900/50">
              <span className="text-3xl font-black text-white tracking-tight">J</span>
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-zinc-900 shadow" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-wide">JARVIS</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Shaxsiy AI Assistant</p>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </div>
        </div>

        {/* Separator */}
        <div className="mx-4 border-t border-white/5 mb-4" />

        {/* Navigatsiya */}
        <nav className="flex flex-col gap-1 px-3 flex-1">
          {([
            { id: "chat",    label: "Chat",          icon: "💬", desc: "Jarvis bilan gaplash" },
            { id: "post",    label: "Post Yaratish",  icon: "✍️", desc: "Telegram post yoz"    },
            { id: "goyalar", label: "G'oyalar",       icon: "💡", desc: "Kontent g'oyalari"    },
          ] as { id: Tab; label: string; icon: string; desc: string }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all ${
                tab === t.id
                  ? "bg-indigo-600/20 border border-indigo-500/30 text-white"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent"
              }`}
            >
              <span className="text-base mt-0.5 shrink-0">{t.icon}</span>
              <div>
                <div className={`text-sm font-medium ${tab === t.id ? "text-indigo-300" : ""}`}>{t.label}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{t.desc}</div>
              </div>
            </button>
          ))}
        </nav>

        {/* Pastki info */}
        <div className="px-4 py-4 border-t border-white/5">
          <div className="text-xs text-zinc-600 leading-relaxed">
            <span className="text-zinc-500">Powered by</span><br />
            Claude Sonnet 4.6
          </div>
        </div>
      </div>

      {/* ── Asosiy panel ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── CHAT ──────────────────────────────────────────────────────── */}
        {tab === "chat" && (
          <>
            {/* Sarlavha */}
            <div className="shrink-0 px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <div>
                <h1 className="text-base font-semibold text-white">Jarvis bilan suhbat</h1>
                <p className="text-xs text-zinc-500 mt-0.5">{xabarlar.length - 1} ta xabar</p>
              </div>
              <button
                onClick={chatTozalash}
                className="text-xs text-zinc-500 hover:text-zinc-300 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors border border-white/5"
              >
                Tozala
              </button>
            </div>

            {/* Xabarlar */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {xabarlar.map((x, i) => (
                <div key={i} className={`flex gap-3 ${x.rol === "men" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                    x.rol === "jarvis"
                      ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow shadow-violet-900/50"
                      : "bg-zinc-700 text-zinc-300"
                  }`}>
                    {x.rol === "jarvis" ? "J" : "S"}
                  </div>
                  <div className={`flex flex-col gap-1 max-w-[72%] ${x.rol === "men" ? "items-end" : "items-start"}`}>
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      x.rol === "men"
                        ? "bg-indigo-600 text-white rounded-tr-sm"
                        : "bg-zinc-800 text-zinc-100 rounded-tl-sm border border-white/5"
                    }`}>
                      {x.matn}
                    </div>
                    <span className="text-xs text-zinc-600 px-1">{x.vaqt}</span>
                  </div>
                </div>
              ))}

              {/* Streaming xabar — real vaqtda to'ldiriladi */}
              {streamingMatn !== null && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 mt-0.5 shadow shadow-violet-900/50">
                    <span className="text-white text-xs font-bold">J</span>
                  </div>
                  <div className="flex flex-col gap-1 max-w-[72%] items-start">
                    <div className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed whitespace-pre-wrap bg-zinc-800 text-zinc-100 border border-white/5 min-h-[44px]">
                      {streamingMatn || (
                        <div className="flex gap-1.5 items-center h-5">
                          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      )}
                      {streamingMatn && (
                        <span className="inline-block w-0.5 h-4 bg-indigo-400 ml-0.5 animate-pulse align-text-bottom" />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Kutish animatsiyasi — stream boshlanishini kutish */}
              {chatYuklanyapti && streamingMatn === null && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow shadow-violet-900/50">
                    <span className="text-white text-xs font-bold">J</span>
                  </div>
                  <div className="bg-zinc-800 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3.5">
                    <div className="flex gap-1.5 items-center">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatOxiri} />
            </div>

            {/* Tezkor savollar */}
            {xabarlar.length === 1 && !chatYuklanyapti && (
              <div className="px-6 pb-3 flex flex-wrap gap-2">
                {TEZKOR_SAVOLLAR.map((s) => (
                  <button
                    key={s}
                    onClick={() => void chatYuborish(s)}
                    disabled={chatYuklanyapti}
                    className="text-xs px-3 py-1.5 bg-zinc-800 border border-white/10 rounded-full text-zinc-300 hover:border-indigo-500/50 hover:text-indigo-300 hover:bg-indigo-600/10 transition-all disabled:opacity-40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Kiruv */}
            <div className="shrink-0 px-6 py-4 border-t border-white/5 bg-zinc-900/50 backdrop-blur">
              <form
                onSubmit={(e) => { e.preventDefault(); void chatYuborish(); }}
                className="flex gap-2 items-center"
              >
                <input
                  value={chatKiruv}
                  onChange={(e) => setChatKiruv(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void chatYuborish(); } }}
                  placeholder="Jarvisga yozing..."
                  disabled={chatYuklanyapti}
                  className="flex-1 bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 disabled:opacity-40 transition-all"
                />
                <button
                  type="submit"
                  disabled={chatYuklanyapti || !chatKiruv.trim()}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium disabled:opacity-30 transition-all shrink-0 shadow shadow-indigo-900/50"
                >
                  Yuborish
                </button>
              </form>
            </div>
          </>
        )}

        {/* ── POST YARATISH ─────────────────────────────────────────────── */}
        {tab === "post" && (
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="max-w-2xl mx-auto">
              <div className="mb-6">
                <h1 className="text-base font-semibold text-white mb-1">Telegram Post Yozish</h1>
                <p className="text-sm text-zinc-500">Mavzu bering — Jarvis kanal uchun tayyor post yozib beradi</p>
              </div>

              <form onSubmit={postYarat} className="flex gap-2 mb-6">
                <input
                  value={postMavzu}
                  onChange={(e) => setPostMavzu(e.target.value)}
                  placeholder="Mavzu: SMM trendlari, target reklama sirlari..."
                  disabled={postYuklanyapti}
                  className="flex-1 bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 disabled:opacity-40 transition-all"
                />
                <button
                  type="submit"
                  disabled={postYuklanyapti || !postMavzu.trim()}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium disabled:opacity-30 transition-all shrink-0 shadow shadow-indigo-900/50"
                >
                  {postYuklanyapti ? "Yozilmoqda..." : "Yozib ber"}
                </button>
              </form>

              {postYuklanyapti && (
                <div className="bg-zinc-800 border border-white/5 rounded-2xl p-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow shadow-violet-900/50">
                    <span className="text-white text-xl font-black">J</span>
                  </div>
                  <p className="text-sm text-zinc-400 animate-pulse">Jarvis post yozmoqda...</p>
                </div>
              )}

              {postMatn && !postYuklanyapti && (
                <div className="bg-zinc-800 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-zinc-700/30">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">J</span>
                      </div>
                      <span className="text-xs font-medium text-zinc-300">Telegram Post</span>
                      <span className="text-xs text-zinc-600">· {postMatn.length} belgi</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => void postSorov()}
                        className="text-xs px-3 py-1 rounded-lg border border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20 transition-colors"
                      >
                        Qayta
                      </button>
                      <button
                        onClick={postKopiyalash}
                        className={`text-xs px-3 py-1 rounded-lg font-medium transition-all ${
                          postKopiyalandi
                            ? "bg-emerald-500 text-white"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white"
                        }`}
                      >
                        {postKopiyalandi ? "Kopiyalandi!" : "Kopiyalash"}
                      </button>
                    </div>
                  </div>
                  <div className="px-5 py-5 text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed font-mono">
                    {postMatn}
                  </div>
                </div>
              )}

              {!postMatn && !postYuklanyapti && (
                <div className="bg-zinc-800/50 border border-dashed border-white/10 rounded-2xl p-12 text-center">
                  <div className="text-4xl mb-3">✍️</div>
                  <p className="text-sm font-medium text-zinc-400 mb-1">Mavzu kiriting</p>
                  <p className="text-xs text-zinc-600">Jarvis 400–800 belgilik Telegram post yozadi</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── G'OYALAR ──────────────────────────────────────────────────── */}
        {tab === "goyalar" && (
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="max-w-2xl mx-auto">
              <div className="mb-6">
                <h1 className="text-base font-semibold text-white mb-1">Kontent G'oyalari</h1>
                <p className="text-sm text-zinc-500">Nisha yoki mavzu bering — Jarvis 5 ta tayyor g'oya beradi</p>
              </div>

              <form onSubmit={goyaYarat} className="flex gap-2 mb-6">
                <input
                  value={goyaMavzu}
                  onChange={(e) => setGoyaMavzu(e.target.value)}
                  placeholder="Nisha: go'zallik saloni, fitnes, restoran..."
                  disabled={goyaYuklanyapti}
                  className="flex-1 bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 disabled:opacity-40 transition-all"
                />
                <button
                  type="submit"
                  disabled={goyaYuklanyapti || !goyaMavzu.trim()}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium disabled:opacity-30 transition-all shrink-0 shadow shadow-indigo-900/50"
                >
                  {goyaYuklanyapti ? "Tayyorlanmoqda..." : "G'oyalar"}
                </button>
              </form>

              {goyaYuklanyapti && (
                <div className="bg-zinc-800 border border-white/5 rounded-2xl p-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow shadow-violet-900/50">
                    <span className="text-white text-xl font-black">J</span>
                  </div>
                  <p className="text-sm text-zinc-400 animate-pulse">Jarvis g'oyalarni tayyorlamoqda...</p>
                </div>
              )}

              {goyaMatn && !goyaYuklanyapti && (
                <div className="bg-zinc-800 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-zinc-700/30">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">J</span>
                      </div>
                      <span className="text-xs font-medium text-zinc-300">5 ta Kontent G'oyasi</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => void goyaSorov()}
                        className="text-xs px-3 py-1 rounded-lg border border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20 transition-colors"
                      >
                        Qayta
                      </button>
                      <button
                        onClick={goyaKopiyalash}
                        className={`text-xs px-3 py-1 rounded-lg font-medium transition-all ${
                          goyaKopiyalandi
                            ? "bg-emerald-500 text-white"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white"
                        }`}
                      >
                        {goyaKopiyalandi ? "Kopiyalandi!" : "Kopiyalash"}
                      </button>
                    </div>
                  </div>
                  <div className="px-5 py-5 text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
                    {goyaMatn}
                  </div>
                </div>
              )}

              {!goyaMatn && !goyaYuklanyapti && (
                <div className="bg-zinc-800/50 border border-dashed border-white/10 rounded-2xl p-12 text-center">
                  <div className="text-4xl mb-3">💡</div>
                  <p className="text-sm font-medium text-zinc-400 mb-1">Nisha kiriting</p>
                  <p className="text-xs text-zinc-600">Jarvis 5 ta kontent g'oyasi beradi (format tavsiyasi bilan)</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
