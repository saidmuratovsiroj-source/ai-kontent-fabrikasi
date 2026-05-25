"use client";

import { useEffect, useState } from "react";

type RunRecord = {
  id:        string;
  title:     string;
  status:    "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  input:     string;
  createdAt: string;
  approved:  boolean;
  costUsd:   number;
  plan:      string;
  topic:     string;
  script:    string;
  thumbnail: string;
  report:    string;
};

const STATUS_STYLE: Record<RunRecord["status"], string> = {
  COMPLETED: "bg-green-100 text-green-700",
  FAILED:    "bg-red-100 text-red-700",
  RUNNING:   "bg-yellow-100 text-yellow-700",
  PENDING:   "bg-slate-100 text-slate-500",
};

const STATUS_LABEL: Record<RunRecord["status"], string> = {
  COMPLETED: "Tayyor",
  FAILED:    "Xato",
  RUNNING:   "Ishlayapti",
  PENDING:   "Kutmoqda",
};

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
        active ? "border-indigo-500 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      {label}
    </button>
  );
}

function RunDetail({ run }: { run: RunRecord }) {
  const [tab, setTab] = useState<"script" | "thumbnail" | "report">("script");

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      {run.plan && (
        <p className="text-xs text-slate-500 mb-3 p-2.5 bg-slate-50 rounded-lg leading-relaxed">
          <span className="font-semibold text-slate-600">Reja: </span>{run.plan}
        </p>
      )}

      <div className="flex border-b border-slate-100 mb-3">
        <Tab label="✍️ Ssenariy"  active={tab === "script"}    onClick={() => setTab("script")} />
        <Tab label="🎨 Thumbnail" active={tab === "thumbnail"} onClick={() => setTab("thumbnail")} />
        <Tab label="🔍 Tadqiqot"  active={tab === "report"}    onClick={() => setTab("report")} />
      </div>

      <div className="max-h-96 overflow-y-auto">
        {tab === "script" && (
          run.script
            ? <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{run.script}</pre>
            : <p className="text-sm text-slate-400 italic">Ssenariy mavjud emas</p>
        )}
        {tab === "thumbnail" && (
          run.thumbnail
            ? <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{run.thumbnail}</pre>
            : <p className="text-sm text-slate-400 italic">Thumbnail mavjud emas</p>
        )}
        {tab === "report" && (
          run.report
            ? <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{run.report}</pre>
            : <p className="text-sm text-slate-400 italic">Tadqiqot mavjud emas</p>
        )}
      </div>
    </div>
  );
}

function RunCard({ run }: { run: RunRecord }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      <div
        className="px-6 py-4 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start gap-3">
          {/* Status dot */}
          <span className={`mt-1 shrink-0 w-2.5 h-2.5 rounded-full ${
            run.status === "COMPLETED" ? "bg-green-400" :
            run.status === "FAILED"    ? "bg-red-400" :
            "bg-yellow-400"
          }`} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-800 text-sm truncate max-w-md">{run.title}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[run.status]}`}>
                {STATUS_LABEL[run.status]}
              </span>
              {run.approved && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                  ✓ Tasdiqlangan
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 mt-1">
              {new Date(run.createdAt).toLocaleString("uz-UZ")}
              {run.costUsd > 0 && (
                <span className="ml-3 font-medium text-slate-500">💰 ${run.costUsd.toFixed(4)}</span>
              )}
            </p>

            {!expanded && run.script && (
              <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                {run.script.slice(0, 180)}…
              </p>
            )}
          </div>

          <span className={`text-slate-400 text-sm transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`}>
            ▾
          </span>
        </div>
      </div>

      {expanded && (
        <div className="px-6 pb-5">
          <RunDetail run={run} />
        </div>
      )}
    </div>
  );
}

export default function ContentPage() {
  const [runs,    setRuns]    = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/runs");
      if (r.ok) setRuns(await r.json() as RunRecord[]);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const filtered = runs.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.input.toLowerCase().includes(search.toLowerCase())
  );

  const completed = runs.filter((r) => r.status === "COMPLETED").length;
  const totalCost = runs.reduce((s, r) => s + r.costUsd, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kontent arxivi</h1>
          <p className="text-slate-500 mt-1">Barcha yaratilgan ssenariylar va tadqiqotlar</p>
        </div>
        <button
          onClick={() => void load()}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
        >
          ↻ Yangilash
        </button>
      </div>

      {/* Stats */}
      {runs.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Jami yugurishlar", value: String(runs.length) },
            { label: "Muvaffaqiyatli",  value: String(completed) },
            { label: "Jami xarajat",    value: `$${totalCost.toFixed(4)}` },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200 px-5 py-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      {runs.length > 0 && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Mavzu yoki so'rov bo'yicha qidirish..."
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm
            focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
        />
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-2/3 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm font-medium">
            {search ? "Qidiruv natijasi topilmadi" : "Hali hech qanday kontent yaratilmagan"}
          </p>
          {!search && (
            <p className="text-xs mt-1">
              Roy yugurishlari sahifasida birinchi pipeline'ni ishga tushiring
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((run) => (
            <RunCard key={run.id} run={run} />
          ))}
        </div>
      )}
    </div>
  );
}
