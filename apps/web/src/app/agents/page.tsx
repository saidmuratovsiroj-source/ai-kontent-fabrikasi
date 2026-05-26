"use client";

import { useEffect, useState } from "react";
import ChatInterface from "@/components/ChatInterface";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface Agent {
  id: string;
  name: string;
  role: string;
  model: string;
  isActive: boolean;
  systemPrompt: string;
}

const ROLE_LABEL: Record<string, string> = {
  PLANNER:    "Rejalashtiruvchi",
  RESEARCHER: "Tadqiqotchi",
  CRITIC:     "Tanqidchi",
  WRITER:     "Ssenarist",
  EDITOR:     "Dizayner",
};

const ROLE_ICON: Record<string, string> = {
  PLANNER:    "🧠",
  RESEARCHER: "🔍",
  CRITIC:     "⚖️",
  WRITER:     "✍️",
  EDITOR:     "🎨",
};

const ROLE_COLOR: Record<string, string> = {
  PLANNER:    "bg-indigo-900 border-indigo-700",
  RESEARCHER: "bg-blue-900 border-blue-700",
  CRITIC:     "bg-orange-900 border-orange-700",
  WRITER:     "bg-green-900 border-green-700",
  EDITOR:     "bg-purple-900 border-purple-700",
};

const ROLE_ACTIVE: Record<string, string> = {
  PLANNER:    "ring-2 ring-indigo-500",
  RESEARCHER: "ring-2 ring-blue-500",
  CRITIC:     "ring-2 ring-orange-500",
  WRITER:     "ring-2 ring-green-500",
  EDITOR:     "ring-2 ring-purple-500",
};

// OpenRouter orqali mavjud modellar
const MODELLAR = [
  { group: "Anthropic",  id: "anthropic/claude-opus-4-7",            label: "Claude Opus 4.7",          nota: "Eng kuchli" },
  { group: "Anthropic",  id: "claude-sonnet-4-6",                    label: "Claude Sonnet 4.6",        nota: "Balansli" },
  { group: "Anthropic",  id: "claude-haiku-4-5-20251001",            label: "Claude Haiku 4.5",         nota: "Tez/arzon" },
  { group: "Anthropic",  id: "anthropic/claude-3.5-sonnet",          label: "Claude 3.5 Sonnet",        nota: "Avvalgi" },
  { group: "OpenAI",     id: "openai/gpt-4o",                        label: "GPT-4o",                   nota: "Kuchli" },
  { group: "OpenAI",     id: "openai/gpt-4o-mini",                   label: "GPT-4o Mini",              nota: "Arzon" },
  { group: "OpenAI",     id: "openai/gpt-4.1",                       label: "GPT-4.1",                  nota: "Yangi" },
  { group: "Google",     id: "google/gemini-2.5-flash",              label: "Gemini 2.5 Flash",         nota: "Tez" },
  { group: "Google",     id: "google/gemini-2.5-pro",                label: "Gemini 2.5 Pro",           nota: "Kuchli" },
  { group: "Meta",       id: "meta-llama/llama-3.3-70b-instruct",    label: "Llama 3.3 70B",            nota: "Ochiq" },
];

function modelQisqa(model: string): string {
  const topildi = MODELLAR.find((m) => m.id === model);
  if (topildi) return topildi.label;
  return model.replace("anthropic/", "").replace("openai/", "").replace("google/", "").replace("meta-llama/", "");
}

export default function AgentsPage() {
  const [agents,       setAgents]       = useState<Agent[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState<Agent | null>(null);
  const [promptOchiq,  setPromptOchiq]  = useState(false);
  const [modelEdit,    setModelEdit]    = useState(false);
  const [yangiModel,   setYangiModel]   = useState("");
  const [saqlanyapti,  setSaqlanyapti]  = useState(false);
  const [xabar,        setXabar]        = useState<string | null>(null);

  async function load() {
    try {
      const r   = await fetch(`${API}/api/agents`);
      const data: Agent[] = await r.json();
      setAgents(data);
      if (!selected) setSelected(data[0] ?? null);
      else {
        const yangilangan = data.find((a) => a.id === selected.id);
        if (yangilangan) setSelected(yangilangan);
      }
    } catch { /* jim */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function agentTanla(agent: Agent) {
    setSelected(agent);
    setPromptOchiq(false);
    setModelEdit(false);
    setYangiModel(agent.model);
    setXabar(null);
  }

  async function modelSaqla() {
    if (!selected || !yangiModel || yangiModel === selected.model) {
      setModelEdit(false);
      return;
    }
    setSaqlanyapti(true);
    try {
      const r = await fetch(`${API}/api/agents/${selected.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ model: yangiModel }),
      });
      if (r.ok) {
        setXabar("✓ Model yangilandi");
        setModelEdit(false);
        await load();
      } else {
        setXabar("⚠️ Saqlashda xato");
      }
    } catch {
      setXabar("⚠️ Server bilan bog'lanib bo'lmadi");
    } finally {
      setSaqlanyapti(false);
      setTimeout(() => setXabar(null), 3000);
    }
  }

  async function toggleFaol() {
    if (!selected) return;
    await fetch(`${API}/api/agents/${selected.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ isActive: !selected.isActive }),
    });
    await load();
  }

  return (
    <div className="flex gap-6 h-full max-w-7xl mx-auto">

      {/* ── Chap: agent kartalar ── */}
      <div className="w-72 shrink-0 flex flex-col gap-2 overflow-y-auto">
        <div className="mb-2">
          <h1 className="text-xl font-bold text-white">Agentlar</h1>
          <p className="text-gray-400 text-xs mt-0.5">5 ta ixtisoslashgan AI-agent</p>
        </div>

        {loading ? (
          <div className="text-gray-500 text-sm text-center py-8">Yuklanmoqda...</div>
        ) : (
          agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => agentTanla(agent)}
              className={`w-full text-left p-4 rounded-xl border transition ${
                ROLE_COLOR[agent.role] ?? "bg-gray-800 border-gray-700"
              } ${selected?.id === agent.id
                  ? (ROLE_ACTIVE[agent.role] ?? "ring-2 ring-gray-500")
                  : "hover:brightness-125 opacity-80"}`}
            >
              <div className="flex items-center gap-3 mb-1.5">
                <span className="text-xl">{ROLE_ICON[agent.role] ?? "🤖"}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-semibold text-sm leading-tight">{agent.name}</p>
                  <p className="text-xs text-gray-300">{ROLE_LABEL[agent.role] ?? agent.role}</p>
                </div>
                <span className={`w-2 h-2 rounded-full shrink-0 ${agent.isActive ? "bg-green-400" : "bg-gray-600"}`} title={agent.isActive ? "Faol" : "Nofaol"} />
              </div>
              <p className="text-xs text-gray-400 font-mono truncate pl-8">{modelQisqa(agent.model)}</p>
            </button>
          ))
        )}
      </div>

      {/* ── O'ng: agent tahrirlash + chat ── */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">

        {/* Agent sozlamalari paneli */}
        {selected && (
          <div className={`rounded-2xl border p-4 ${ROLE_COLOR[selected.role] ?? "bg-gray-800 border-gray-700"}`}>
            <div className="flex items-center gap-4 flex-wrap">
              {/* Ism + rol */}
              <div className="flex items-center gap-3">
                <span className="text-2xl">{ROLE_ICON[selected.role] ?? "🤖"}</span>
                <div>
                  <p className="text-white font-bold">{selected.name}</p>
                  <p className="text-xs text-gray-300">{ROLE_LABEL[selected.role]}</p>
                </div>
              </div>

              {/* Model tanlash */}
              <div className="flex items-center gap-2 ml-4">
                <span className="text-xs text-gray-400">Model:</span>
                {modelEdit ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={yangiModel}
                      onChange={(e) => setYangiModel(e.target.value)}
                      className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1.5 border border-gray-600 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {Array.from(new Set(MODELLAR.map((m) => m.group))).map((group) => (
                        <optgroup key={group} label={group}>
                          {MODELLAR.filter((m) => m.group === group).map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.label} — {m.nota}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <button
                      onClick={modelSaqla}
                      disabled={saqlanyapti}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg disabled:opacity-50 transition"
                    >
                      {saqlanyapti ? "..." : "Saqlash"}
                    </button>
                    <button
                      onClick={() => setModelEdit(false)}
                      className="px-2 py-1.5 text-gray-400 hover:text-gray-200 text-xs transition"
                    >
                      Bekor
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-white bg-black/30 px-2 py-1 rounded-lg">
                      {modelQisqa(selected.model)}
                    </span>
                    <button
                      onClick={() => { setModelEdit(true); setYangiModel(selected.model); }}
                      className="text-xs text-gray-400 hover:text-white transition px-2 py-1 rounded-lg hover:bg-black/20"
                    >
                      ✏️ O'zgartirish
                    </button>
                  </div>
                )}
              </div>

              {/* Faol/nofaol */}
              <div className="flex items-center gap-2 ml-auto">
                {xabar && <span className="text-xs text-green-400">{xabar}</span>}
                <button
                  onClick={toggleFaol}
                  className={`text-xs px-3 py-1.5 rounded-lg transition ${
                    selected.isActive
                      ? "bg-green-900 text-green-300 hover:bg-green-800"
                      : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                  }`}
                >
                  {selected.isActive ? "● Faol" : "○ Nofaol"}
                </button>
              </div>
            </div>

            {/* System prompt accordion */}
            <div className="mt-3 border-t border-white/10 pt-3">
              <button
                onClick={() => setPromptOchiq((v) => !v)}
                className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-200 transition"
              >
                <span className={`transition-transform ${promptOchiq ? "rotate-90" : ""}`}>▶</span>
                System prompt ({selected.systemPrompt.split(/\s+/).length} so'z)
              </button>
              {promptOchiq && (
                <pre className="mt-2 text-xs text-gray-300 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto bg-black/20 rounded-xl p-3">
                  {selected.systemPrompt}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* Chat */}
        <div className="flex-1 bg-gray-800 border border-gray-700 rounded-2xl p-5 flex flex-col min-h-0 overflow-hidden">
          {selected ? (
            <ChatInterface key={selected.id} agentId={selected.id} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-2">🤖</div>
                <p>Chap tarafdan agent tanlang</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
