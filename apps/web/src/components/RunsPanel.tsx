"use client";

import { useState, useRef } from "react";

type StepStatus = "waiting" | "running" | "done" | "approved" | "rejected" | "error";

type LogStep = {
  id:       number;
  agent:    string;
  status:   StepStatus;
  round?:   number;
  message:  string;
  score?:   number;
  queries?: string[];
  verdict?: string;
  issues?:  string[];
  preview?: string;
  topic?:   string;
};

type FinalResult = {
  approved:    boolean;
  plan:        string;
  topic:       string;
  finalReport: string;
  script:      string;
  thumbnail:   string;
  costUsd?:    number;
};

const AGENT_ICONS: Record<string, string> = {
  "Стратег":       "🧠",
  "Исследователь": "🔍",
  "Критик":        "🎯",
  "Сценарист":     "✍️",
  "Дизайнер":      "🎨",
};

const STATUS_COLORS: Record<StepStatus, string> = {
  waiting:  "text-slate-400",
  running:  "text-yellow-500",
  done:     "text-blue-600",
  approved: "text-green-600",
  rejected: "text-red-500",
  error:    "text-red-600",
};

const STATUS_BG: Record<StepStatus, string> = {
  waiting:  "bg-slate-100",
  running:  "bg-yellow-50 border-yellow-200",
  done:     "bg-blue-50 border-blue-200",
  approved: "bg-green-50 border-green-200",
  rejected: "bg-red-50 border-red-200",
  error:    "bg-red-50 border-red-200",
};

const STATUS_LABELS: Record<StepStatus, string> = {
  waiting:  "Kutmoqda",
  running:  "Ishlayapti...",
  done:     "Bajarildi",
  approved: "Tasdiqlandi ✓",
  rejected: "Qayta yuborildi",
  error:    "Xato",
};

function SpinnerIcon() {
  return (
    <svg className="w-4 h-4 animate-spin text-yellow-500" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
    </svg>
  );
}

export default function RunsPanel() {
  const [input,       setInput]       = useState("");
  const [running,     setRunning]     = useState(false);
  const [steps,       setSteps]       = useState<LogStep[]>([]);
  const [result,      setResult]      = useState<FinalResult | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [activeTab,   setActiveTab]   = useState<"report" | "script" | "thumbnail">("script");
  const stepIdRef                     = useRef(0);
  const logEndRef                     = useRef<HTMLDivElement>(null);

  const addStep = (data: Omit<LogStep, "id">) => {
    const step: LogStep = { ...data, id: stepIdRef.current++ };
    setSteps((prev) => [...prev, step]);
    setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    return step.id;
  };

  const updateLastStep = (agent: string, status: StepStatus, extra?: Partial<LogStep>) => {
    setSteps((prev) => {
      const idx = [...prev].reverse().findIndex((s) => s.agent === agent && s.status === "running");
      if (idx === -1) return prev;
      const realIdx = prev.length - 1 - idx;
      const updated  = [...prev];
      updated[realIdx] = { ...updated[realIdx], status, ...extra };
      return updated;
    });
  };

  const startRun = async () => {
    if (!input.trim() || running) return;

    setRunning(true);
    setSteps([]);
    setResult(null);
    setError(null);
    setActiveTab("script");
    stepIdRef.current = 0;

    try {
      const res = await fetch("/api/pipeline/stream", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userRequest: input.trim() }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Server xatosi: ${res.status}`);
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const chunk of lines) {
          const eventLine = chunk.match(/^event: (.+)$/m);
          const dataLine  = chunk.match(/^data: (.+)$/ms);
          if (!eventLine || !dataLine) continue;

          const event = eventLine[1].trim();
          let   data: Record<string, unknown>;
          try { data = JSON.parse(dataLine[1].trim()); }
          catch { continue; }

          if (event === "start") {
            addStep({ agent: "Tizim", status: "done", message: `So'rov qabul qilindi: "${data.userRequest}"` });
          }

          if (event === "step") {
            const status  = data.status as StepStatus;
            const agent   = data.agent as string;
            const message = data.message as string;

            if (status === "running") {
              addStep({ agent, status: "running", round: data.round as number | undefined, message });
            } else {
              updateLastStep(agent, status, {
                message,
                score:   data.score   as number  | undefined,
                queries: data.queries as string[] | undefined,
                verdict: data.verdict as string  | undefined,
                issues:  data.issues  as string[] | undefined,
                preview: data.preview as string  | undefined,
                topic:   data.topic   as string  | undefined,
              });
            }
          }

          if (event === "done") {
            setResult(data as unknown as FinalResult);
            addStep({
              agent:   "Tizim",
              status:  (data.approved as boolean) ? "approved" : "done",
              message: (data.approved as boolean)
                ? "Pipeline muvaffaqiyatli tugadi — hisobot tasdiqlandi!"
                : "Pipeline tugadi (max retry yetdi) — eng yaxshi natija saqlandi.",
            });
          }

          if (event === "error") {
            setError(data.message as string);
            addStep({ agent: "Tizim", status: "error", message: `Xato: ${data.message}` });
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ulanish xatosi";
      setError(msg);
      addStep({ agent: "Tizim", status: "error", message: msg });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Yangi прогон
        </h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && startRun()}
            placeholder="YouTube mavzusini kiriting... (masalan: Нейросети для заработка 2025)"
            disabled={running}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm
              focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent
              disabled:opacity-50 disabled:bg-slate-50"
          />
          <button
            onClick={startRun}
            disabled={!input.trim() || running}
            className="px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm
              font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors
              flex items-center gap-2"
          >
            {running ? (
              <><SpinnerIcon /> Ishlayapti...</>
            ) : (
              <>▶ Запустить</>
            )}
          </button>
        </div>
      </div>

      {/* Live Log */}
      {steps.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Прогон — jonli jarayon</h2>
            {running && (
              <span className="flex items-center gap-1.5 text-xs text-yellow-600 font-medium">
                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                Ishlayapti
              </span>
            )}
          </div>

          <div className="divide-y divide-slate-50">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`px-6 py-3 border-l-4 transition-all ${STATUS_BG[step.status]} ${
                  step.status === "running" ? "border-yellow-400" :
                  step.status === "approved" ? "border-green-400" :
                  step.status === "rejected" ? "border-red-400" :
                  step.status === "error"    ? "border-red-400" :
                  "border-transparent"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <span className="text-lg mt-0.5 shrink-0">
                    {AGENT_ICONS[step.agent] ?? "⚙️"}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-700">{step.agent}</span>
                      {step.round !== undefined && (
                        <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                          Round {step.round}
                        </span>
                      )}
                      <span className={`text-xs font-medium ${STATUS_COLORS[step.status]} flex items-center gap-1`}>
                        {step.status === "running" && <SpinnerIcon />}
                        {STATUS_LABELS[step.status]}
                      </span>
                      {step.score !== undefined && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          step.score >= 7 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          {step.score}/10
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-600 mt-0.5">{step.message}</p>

                    {step.topic && (
                      <p className="text-xs text-indigo-600 mt-1 font-medium">
                        📌 Mavzu: {step.topic}
                      </p>
                    )}

                    {step.queries && step.queries.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {step.queries.map((q, i) => (
                          <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                            🔎 {q.length > 50 ? q.slice(0, 50) + "…" : q}
                          </span>
                        ))}
                      </div>
                    )}

                    {step.verdict && (
                      <p className="text-xs text-slate-500 mt-1 italic">"{step.verdict}"</p>
                    )}

                    {step.issues && step.issues.length > 0 && (
                      <ul className="text-xs text-red-600 mt-1 space-y-0.5">
                        {step.issues.map((issue, i) => (
                          <li key={i}>⚠ {issue}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div ref={logEndRef} />
        </div>
      )}

      {/* Final Result — 3 tab */}
      {result && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 flex-wrap">
            <span className={`w-3 h-3 rounded-full shrink-0 ${result.approved ? "bg-green-400" : "bg-yellow-400"}`} />
            <h2 className="font-semibold text-slate-700">
              {result.approved ? "✅ Kontent tayyor!" : "⚠️ Kontent (max retry)"}
            </h2>
            {result.costUsd !== undefined && (
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                💰 ${result.costUsd.toFixed(4)}
              </span>
            )}
            <span className="text-xs text-slate-400 ml-auto truncate max-w-xs">{result.topic}</span>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-100">
            {(["script", "thumbnail", "report"] as const).map((tab) => {
              const labels = { script: "✍️ Ssenariy", thumbnail: "🎨 Thumbnail", report: "🔍 Tadqiqot" };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === tab
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="px-6 py-5 max-h-[600px] overflow-y-auto">
            {activeTab === "script" && (
              <>
                <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">Стратег rejasi</p>
                <p className="text-sm text-slate-600 mb-5 p-3 bg-slate-50 rounded-lg">{result.plan}</p>
                <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">To'liq ssenariy</p>
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {result.script}
                </pre>
              </>
            )}
            {activeTab === "thumbnail" && (
              <>
                <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">Thumbnail konsepsiyalari</p>
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {result.thumbnail}
                </pre>
              </>
            )}
            {activeTab === "report" && (
              <>
                <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">Исследователь hisoboti</p>
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {result.finalReport}
                </pre>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
