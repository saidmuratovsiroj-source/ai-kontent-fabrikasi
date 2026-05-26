"use client";

import { useEffect, useRef, useState } from "react";

type TestHolat = {
  id:     string;
  raqam:  number;
  mavzu:  string;
  tavsif: string;
  mezonlar: {
    minSozlar:        number;
    maxSozlar:        number;
    minSarlavhalar:   number;
    minMuqovaGoyalar: number;
    faqatOzbek:       boolean;
  };
};

type MezonNatija = {
  nom:           string;
  utdi:          boolean;
  haqiqiyQiymat: string;
  talab:         string;
};

type ValidationNatija = {
  testId:            string;
  mavzu:             string;
  umummuvaffaqiyat:  boolean;
  mezonlar:          MezonNatija[];
};

type Bosqich = { agent: string; status: string; message?: string };

type HolatTuri = "tayyor" | "yuklanyapti" | "ishlayapti" | "tugadi" | "xato";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function TestPanel() {
  const [ochiq,      setOchiq]      = useState(true);
  const [testlar,    setTestlar]    = useState<TestHolat[]>([]);
  const [tanlangan,  setTanlangan]  = useState<string | null>(null);
  const [holat,      setHolat]      = useState<HolatTuri>("tayyor");
  const [bosqichlar, setBosqichlar] = useState<Bosqich[]>([]);
  const [validation, setValidation] = useState<ValidationNatija | null>(null);
  const [xato,       setXato]       = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  // Test holatlari yuklash
  useEffect(() => {
    if (!ochiq || testlar.length > 0) return;
    fetch(`${API}/api/tests`)
      .then((r) => r.json())
      .then((d) => setTestlar(d as TestHolat[]))
      .catch(() => {});
  }, [ochiq, testlar.length]);

  function testBoshlash() {
    if (!tanlangan) return;
    const test = testlar.find((t) => t.id === tanlangan);
    if (!test) return;

    setHolat("ishlayapti");
    setBosqichlar([]);
    setValidation(null);
    setXato(null);

    const es = new EventSource(
      `${API}/api/pipeline/stream?mavzu=${encodeURIComponent(test.mavzu)}`,
      { withCredentials: false }
    );

    // SSE POST workaround — EventSource faqat GET qiladi, shuning uchun fetch + ReadableStream
    es.close();

    // Pipeline SSE ni fetch orqali ishlatamiz
    const controller = new AbortController();
    esRef.current?.close();

    void (async () => {
      let script    = "";
      let thumbnail = "";

      try {
        const res = await fetch(`${API}/api/pipeline/stream`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ userRequest: test.mavzu }),
          signal:  controller.signal,
        });

        if (!res.ok || !res.body) throw new Error(`Server xatosi: ${res.status}`);

        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let   buf     = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          const qatorlar = buf.split("\n");
          buf = qatorlar.pop() ?? "";

          for (const qator of qatorlar) {
            if (!qator.startsWith("data:")) continue;
            try {
              const d = JSON.parse(qator.slice(5)) as Record<string, unknown>;

              if (d["agent"] && d["status"]) {
                setBosqichlar((prev) => {
                  const yangi = { agent: String(d["agent"]), status: String(d["status"]), message: d["message"] as string | undefined };
                  const prev2 = prev.filter((b) => !(b.agent === yangi.agent && b.status === "running"));
                  return [...prev2, yangi];
                });
              }

              if (d["script"])    script    = String(d["script"]);
              if (d["thumbnail"]) thumbnail = String(d["thumbnail"]);

              if ("approved" in d) {
                // done event
                setHolat("tugadi");
                // Validatsiya
                const vRes = await fetch(`${API}/api/test/validate`, {
                  method:  "POST",
                  headers: { "Content-Type": "application/json" },
                  body:    JSON.stringify({ testId: tanlangan, script, thumbnail }),
                });
                if (vRes.ok) setValidation(await vRes.json() as ValidationNatija);
              }
            } catch { /* noto'g'ri JSON qatorlari */ }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setXato((err as Error).message);
          setHolat("xato");
        }
      }
    })();

    return () => controller.abort();
  }

  function qaytaYuklash() {
    setHolat("tayyor");
    setBosqichlar([]);
    setValidation(null);
    setXato(null);
  }

  const AGENT_ICON: Record<string, string> = {
    "Стратег": "🧭", "Исследователь": "🔍", "Критик": "⚖️",
    "Сценарист": "✍️", "Дизайнер": "🎨",
  };

  return (
    <section className="space-y-3">
      {/* Sarlavha — bosilganda ochiladi/yopiladi */}
      <button
        onClick={() => setOchiq((v) => !v)}
        className="w-full flex items-center justify-between text-left group"
      >
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide group-hover:text-slate-700 transition-colors">
          🧪 Sifat testlari
        </h2>
        <span className={`text-slate-400 text-xs transition-transform ${ochiq ? "rotate-180" : ""}`}>▾</span>
      </button>

      {ochiq && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">

          {/* Test tanlash */}
          {holat === "tayyor" && (
            <>
              <p className="text-xs text-slate-500">
                Mavzuni tanlang va pipeline'ni ishga tushiring — natija avtomatik tekshiriladi.
              </p>
              <div className="space-y-2">
                {testlar.length === 0 ? (
                  <p className="text-xs text-slate-400 animate-pulse">Testlar yuklanmoqda...</p>
                ) : testlar.map((t) => (
                  <label
                    key={t.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      tanlangan === t.id
                        ? "border-indigo-400 bg-indigo-50"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="test"
                      value={t.id}
                      checked={tanlangan === t.id}
                      onChange={() => setTanlangan(t.id)}
                      className="mt-0.5 accent-indigo-500"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 leading-snug">
                        {t.raqam}. {t.mavzu}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{t.tavsif}</p>
                    </div>
                  </label>
                ))}
              </div>

              <button
                onClick={testBoshlash}
                disabled={!tanlangan}
                className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium
                  hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                🧪 Test ishlatish
              </button>
            </>
          )}

          {/* Pipeline jarayoni */}
          {holat === "ishlayapti" && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-600">Pipeline ishlayapti...</p>
              {bosqichlar.map((b, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span>{AGENT_ICON[b.agent] ?? "⚙️"}</span>
                  <span className="font-medium text-slate-700">{b.agent}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    b.status === "done" || b.status === "approved"
                      ? "bg-green-100 text-green-700"
                      : b.status === "error" || b.status === "rejected"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {b.status === "running" ? "⏳ ishlayapti"
                     : b.status === "done" || b.status === "approved" ? "✓ tayyor"
                     : b.status === "rejected" ? "↻ qayta"
                     : b.status === "error" ? "✗ xato"
                     : b.status}
                  </span>
                </div>
              ))}
              {bosqichlar.length === 0 && (
                <p className="text-xs text-slate-400 animate-pulse">Boshlanmoqda...</p>
              )}
            </div>
          )}

          {/* Xato */}
          {holat === "xato" && (
            <div className="space-y-3">
              <p className="text-sm text-red-600 font-medium">⚠️ Xato: {xato}</p>
              <button onClick={qaytaYuklash} className="text-xs text-indigo-600 hover:underline">
                ← Qaytish
              </button>
            </div>
          )}

          {/* Validatsiya natijalari */}
          {holat === "tugadi" && validation && (
            <div className="space-y-4">
              <div className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm ${
                validation.umummuvaffaqiyat
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                {validation.umummuvaffaqiyat ? "✅ Barcha mezonlar bajarildi" : "❌ Bir yoki bir necha mezon bajarilmadi"}
              </div>

              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-100">
                    <th className="pb-2 font-medium">Mezon</th>
                    <th className="pb-2 font-medium">Natija</th>
                    <th className="pb-2 font-medium">Talab</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {validation.mezonlar.map((m) => (
                    <tr key={m.nom}>
                      <td className="py-2 text-slate-700 font-medium">{m.nom}</td>
                      <td className={`py-2 font-medium ${m.utdi ? "text-green-600" : "text-red-600"}`}>
                        {m.utdi ? "✓ " : "✗ "}{m.haqiqiyQiymat}
                      </td>
                      <td className="py-2 text-slate-400">{m.talab}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button onClick={qaytaYuklash} className="text-xs text-indigo-600 hover:underline">
                ← Boshqa test tanlash
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
