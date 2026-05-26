"use client";

import { useState, useEffect } from "react";
import RunsPanel from "@/components/RunsPanel";
import { useSearchParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface Run {
  id:          string;
  title:       string;
  status:      string;
  input:       string;
  createdAt:   string;
  budgetSpent: number;
  costUsd:     number;
  approved:    boolean;
  plan:        string;
  topic:       string;
  script:      string;
  thumbnail:   string;
  report:      string;
}

const STATUS_STYLE: Record<string, string> = {
  COMPLETED: "bg-green-900 text-green-300",
  FAILED:    "bg-red-900 text-red-300",
  RUNNING:   "bg-yellow-900 text-yellow-300",
  PENDING:   "bg-gray-700 text-gray-400",
};
const STATUS_LABEL: Record<string, string> = {
  COMPLETED: "Bajarildi",
  FAILED:    "Xato",
  RUNNING:   "Ishlayapti",
  PENDING:   "Kutmoqda",
};

type Tab = "yangi" | "tarix";

function RunDetail({ run, onClose }: { run: Run; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"ssenariy" | "sarlavha" | "tadqiqot" | "reja">("ssenariy");
  const [copied, setCopied] = useState(false);

  function getContent() {
    switch (activeTab) {
      case "ssenariy":  return run.script    || "Ssenariy mavjud emas";
      case "sarlavha":  return run.thumbnail || "Sarlavhalar mavjud emas";
      case "tadqiqot":  return run.report    || "Tadqiqot mavjud emas";
      case "reja":      return run.plan      || "Reja mavjud emas";
    }
  }

  function copy() {
    navigator.clipboard.writeText(getContent()).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center pt-8 px-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl">
        <div className="flex items-start justify-between p-5 border-b border-gray-700 shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">{run.title}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[run.status] ?? "bg-gray-700 text-gray-400"}`}>
                {STATUS_LABEL[run.status] ?? run.status}
              </span>
              <span className="text-gray-500 text-xs">{new Date(run.createdAt).toLocaleString("uz-UZ")}</span>
              <span className="text-gray-500 text-xs">${run.costUsd.toFixed(4)}</span>
              {run.approved && <span className="text-green-400 text-xs">✓ Tasdiqlangan</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl px-2">✕</button>
        </div>

        <div className="flex gap-1 px-5 pt-3 shrink-0">
          {(["ssenariy", "sarlavha", "tadqiqot", "reja"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition capitalize ${
                activeTab === t ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
              }`}
            >
              {t === "ssenariy" ? "Ssenariy" : t === "sarlavha" ? "Sarlavha/Muqova" : t === "tadqiqot" ? "Tadqiqot" : "Reja"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto px-5 py-3">
          <pre className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap font-sans">
            {getContent()}
          </pre>
        </div>

        <div className="flex gap-2 p-4 border-t border-gray-700 shrink-0">
          <button
            onClick={copy}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm transition"
          >
            {copied ? "✓ Nusxalandi!" : "📋 Nusxa olish"}
          </button>
          <a
            href="/videos"
            className="px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg text-sm transition"
          >
            🗂️ Video papkasini ko'rish
          </a>
        </div>
      </div>
    </div>
  );
}

export default function RunsPage() {
  const searchParams   = useSearchParams();
  const initialTopic   = searchParams.get("topic") ?? undefined;
  const [tab, setTab]  = useState<Tab>(initialTopic ? "yangi" : "yangi");

  const [runs,    setRuns]    = useState<Run[]>([]);
  const [loading, setLoading] = useState(false);
  const [detail,  setDetail]  = useState<Run | null>(null);

  async function loadRuns() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/runs`);
      setRuns(await r.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tab === "tarix") loadRuns();
  }, [tab]);

  return (
    <div className="max-w-5xl mx-auto w-full">
      {detail && <RunDetail run={detail} onClose={() => setDetail(null)} />}

      {/* Sarlavha + tablar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Roy yugurishlari</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Mavzu bering — 5 ta agent birgalikda ishlaydi
          </p>
        </div>
        <div className="flex bg-gray-800 rounded-xl p-1 gap-1">
          <button
            onClick={() => setTab("yangi")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              tab === "yangi" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            🚀 Yangi yugurish
          </button>
          <button
            onClick={() => setTab("tarix")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              tab === "tarix" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            📋 Tarix
          </button>
        </div>
      </div>

      {/* Yangi yugurish */}
      {tab === "yangi" && (
        <RunsPanel initialTopic={initialTopic} />
      )}

      {/* Tarix */}
      {tab === "tarix" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-400 text-sm">{runs.length} ta yugurish</p>
            <button
              onClick={loadRuns}
              className="text-sm text-gray-400 hover:text-gray-200 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            >
              ↻ Yangilash
            </button>
          </div>

          {loading ? (
            <div className="text-gray-400 text-center py-12">Yuklanmoqda...</div>
          ) : runs.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <div className="text-5xl mb-3">🚀</div>
              <p>Hali yugurish yo'q. Birinchi progonni boshlang!</p>
              <button
                onClick={() => setTab("yangi")}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition"
              >
                Yangi yugurish
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {runs.map((run) => (
                <div
                  key={run.id}
                  onClick={() => setDetail(run)}
                  className="bg-gray-800 border border-gray-700 hover:border-indigo-600 rounded-xl p-4 cursor-pointer transition group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[run.status] ?? "bg-gray-700 text-gray-400"}`}>
                          {STATUS_LABEL[run.status] ?? run.status}
                        </span>
                        {run.approved && <span className="text-green-400 text-xs">✓</span>}
                      </div>
                      <h3 className="text-white font-semibold text-sm leading-snug truncate">{run.title}</h3>
                      <p className="text-gray-500 text-xs mt-0.5 truncate">{run.input}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-gray-400 text-xs">{new Date(run.createdAt).toLocaleDateString("uz-UZ")}</p>
                      <p className="text-gray-500 text-xs mt-0.5">${run.costUsd.toFixed(4)}</p>
                    </div>
                  </div>

                  <div className="flex gap-1.5 mt-2.5">
                    {run.script    && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900 text-blue-300">Ssenariy</span>}
                    {run.thumbnail && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900 text-purple-300">Sarlavha</span>}
                    {run.report    && <span className="text-xs px-2 py-0.5 rounded-full bg-green-900 text-green-300">Tadqiqot</span>}
                    <span className="ml-auto text-gray-600 text-xs opacity-0 group-hover:opacity-100 transition">Ko'rish →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
