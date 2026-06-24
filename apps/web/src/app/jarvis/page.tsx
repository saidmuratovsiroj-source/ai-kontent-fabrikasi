"use client";

import { useState, useRef, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Tab = "chat" | "post" | "goyalar";

interface Xabar {
  rol: "men" | "jarvis";
  matn: string;
}

export default function JarvisPage() {
  const [tab, setTab] = useState<Tab>("chat");

  // ── Chat holati ────────────────────────────────────────────────────────────
  const [xabarlar, setXabarlar] = useState<Xabar[]>([
    { rol: "jarvis", matn: "Ha, Siroj! Jarvis tayyor. Nima buyurasiz?" },
  ]);
  const [chatKiruv, setChatKiruv] = useState("");
  const [chatYuklanyapti, setChatYuklanyapti] = useState(false);
  const chatOxiri = useRef<HTMLDivElement>(null);

  // ── Post holati ────────────────────────────────────────────────────────────
  const [postMavzu, setPostMavzu] = useState("");
  const [postMatn, setPostMatn] = useState("");
  const [postYuklanyapti, setPostYuklanyapti] = useState(false);
  const [postKopiyalandi, setPostKopiyalandi] = useState(false);

  // ── G'oyalar holati ────────────────────────────────────────────────────────
  const [goyaMavzu, setGoyaMavzu] = useState("");
  const [goyaMatn, setGoyaMatn] = useState("");
  const [goyaYuklanyapti, setGoyaYuklanyapti] = useState(false);

  useEffect(() => {
    chatOxiri.current?.scrollIntoView({ behavior: "smooth" });
  }, [xabarlar]);

  // ── Chat yuborish ──────────────────────────────────────────────────────────
  async function chatYuborish(e: React.FormEvent) {
    e.preventDefault();
    const matn = chatKiruv.trim();
    if (!matn || chatYuklanyapti) return;

    const yangiXabarlar: Xabar[] = [...xabarlar, { rol: "men", matn }];
    setXabarlar(yangiXabarlar);
    setChatKiruv("");
    setChatYuklanyapti(true);

    const tarix = yangiXabarlar.slice(1).map((x) => ({
      role: x.rol === "men" ? "user" : "assistant",
      content: x.matn,
    }));

    try {
      const javob = await fetch(`${API}/api/jarvis/chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ xabar: matn, tarix: tarix.slice(0, -1) }),
      });
      const data = await javob.json() as { javob?: string; error?: string };
      setXabarlar((oldingi) => [
        ...oldingi,
        { rol: "jarvis", matn: data.javob ?? data.error ?? "Xato yuz berdi" },
      ]);
    } catch {
      setXabarlar((oldingi) => [
        ...oldingi,
        { rol: "jarvis", matn: "❌ Server bilan bog'lanib bo'lmadi" },
      ]);
    } finally {
      setChatYuklanyapti(false);
    }
  }

  function chatTozalash() {
    setXabarlar([{ rol: "jarvis", matn: "Ha, Siroj! Jarvis tayyor. Nima buyurasiz?" }]);
  }

  // ── Post generatsiya ───────────────────────────────────────────────────────
  async function postYarat(e: React.FormEvent) {
    e.preventDefault();
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
      setPostMatn("❌ Server bilan bog'lanib bo'lmadi");
    } finally {
      setPostYuklanyapti(false);
    }
  }

  function postKopiyalash() {
    navigator.clipboard.writeText(postMatn).then(() => {
      setPostKopiyalandi(true);
      setTimeout(() => setPostKopiyalandi(false), 2000);
    });
  }

  // ── G'oyalar generatsiya ───────────────────────────────────────────────────
  async function goyaYarat(e: React.FormEvent) {
    e.preventDefault();
    if (!goyaMavzu.trim() || goyaYuklanyapti) return;
    setGoyaYuklanyapti(true);
    setGoyaMatn("");

    try {
      const javob = await fetch(`${API}/api/jarvis/goyalar`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ mavzu: goyaMavzu }),
      });
      const data = await javob.json() as { goyalar?: string; error?: string };
      setGoyaMatn(data.goyalar ?? data.error ?? "Xato yuz berdi");
    } catch {
      setGoyaMatn("❌ Server bilan bog'lanib bo'lmadi");
    } finally {
      setGoyaYuklanyapti(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full max-h-screen">
      {/* Sarlavha */}
      <div className="px-6 py-5 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Jarvis</h1>
            <p className="text-sm text-slate-500 mt-0.5">Shaxsiy AI Marketing Assistant</p>
          </div>
          <span className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Tayyor
          </span>
        </div>

        {/* Tablar */}
        <div className="flex gap-1 mt-4 bg-slate-100 p-1 rounded-lg w-fit">
          {([
            { id: "chat",    label: "Chat" },
            { id: "post",    label: "Post Yaratish" },
            { id: "goyalar", label: "G'oyalar" },
          ] as { id: Tab; label: string }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CHAT TABI ─────────────────────────────────────────────────────── */}
      {tab === "chat" && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Xabarlar ro'yxati */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {xabarlar.map((x, i) => (
              <div
                key={i}
                className={`flex ${x.rol === "men" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    x.rol === "men"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm"
                  }`}
                >
                  {x.rol === "jarvis" && (
                    <span className="block text-xs font-semibold text-slate-400 mb-1">JARVIS</span>
                  )}
                  {x.matn}
                </div>
              </div>
            ))}
            {chatYuklanyapti && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatOxiri} />
          </div>

          {/* Kiruv */}
          <div className="px-6 py-4 border-t border-slate-200 bg-white shrink-0">
            <form onSubmit={chatYuborish} className="flex gap-2">
              <button
                type="button"
                onClick={chatTozalash}
                className="px-3 py-2 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Tozala
              </button>
              <input
                value={chatKiruv}
                onChange={(e) => setChatKiruv(e.target.value)}
                placeholder="Jarvisga yozing..."
                disabled={chatYuklanyapti}
                className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={chatYuklanyapti || !chatKiruv.trim()}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Yuborish
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── POST YARATISH TABI ─────────────────────────────────────────────── */}
      {tab === "post" && (
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <form onSubmit={postYarat} className="flex gap-2 mb-6">
            <input
              value={postMavzu}
              onChange={(e) => setPostMavzu(e.target.value)}
              placeholder="Mavzu kiriting... (masalan: SMM trendlari 2025)"
              disabled={postYuklanyapti}
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={postYuklanyapti || !postMavzu.trim()}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
            >
              {postYuklanyapti ? "Yozilmoqda..." : "Post Yarat"}
            </button>
          </form>

          {postYuklanyapti && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 animate-pulse">
              Jarvis post yozmoqda...
            </div>
          )}

          {postMatn && !postYuklanyapti && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Telegram Post
                </span>
                <button
                  onClick={postKopiyalash}
                  className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
                    postKopiyalandi
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600"
                  }`}
                >
                  {postKopiyalandi ? "Kopiyalandi!" : "Kopiyalash"}
                </button>
              </div>
              <div className="px-4 py-4 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                {postMatn}
              </div>
              <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
                <button
                  onClick={() => { setPostMatn(""); setPostKopiyalandi(false); }}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Yangi mavzu
                </button>
              </div>
            </div>
          )}

          {!postMatn && !postYuklanyapti && (
            <div className="text-center py-16 text-slate-400">
              <div className="text-4xl mb-3">✍️</div>
              <p className="text-sm">Mavzu kiriting, Jarvis Telegram posti yozadi</p>
            </div>
          )}
        </div>
      )}

      {/* ── G'OYALAR TABI ─────────────────────────────────────────────────── */}
      {tab === "goyalar" && (
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <form onSubmit={goyaYarat} className="flex gap-2 mb-6">
            <input
              value={goyaMavzu}
              onChange={(e) => setGoyaMavzu(e.target.value)}
              placeholder="Nisha yoki mavzu... (masalan: go'zallik saloni, SMM)"
              disabled={goyaYuklanyapti}
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={goyaYuklanyapti || !goyaMavzu.trim()}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
            >
              {goyaYuklanyapti ? "Tayyorlanmoqda..." : "G'oyalar"}
            </button>
          </form>

          {goyaYuklanyapti && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 animate-pulse">
              Jarvis g'oyalarni tayyorlamoqda...
            </div>
          )}

          {goyaMatn && !goyaYuklanyapti && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  5 ta Kontent G'oyasi
                </span>
                <button
                  onClick={() => navigator.clipboard.writeText(goyaMatn)}
                  className="text-xs px-3 py-1 rounded-lg font-medium bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  Kopiyalash
                </button>
              </div>
              <div className="px-4 py-4 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                {goyaMatn}
              </div>
              <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
                <button
                  onClick={() => setGoyaMatn("")}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Yangi nisha
                </button>
              </div>
            </div>
          )}

          {!goyaMatn && !goyaYuklanyapti && (
            <div className="text-center py-16 text-slate-400">
              <div className="text-4xl mb-3">💡</div>
              <p className="text-sm">Nisha yoki mavzu kiriting, Jarvis 5 ta g'oya beradi</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
