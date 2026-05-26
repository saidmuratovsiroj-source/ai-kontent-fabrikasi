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
  WRITER:     "Yozuvchi",
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

function modelQisqa(model: string): string {
  return model.replace("anthropic/", "").replace("openai/", "");
}

export default function AgentsPage() {
  const [agents,   setAgents]   = useState<Agent[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<Agent | null>(null);
  const [promptOchiq, setPromptOchiq] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/agents`)
      .then((r) => r.json())
      .then((data: Agent[]) => {
        setAgents(data);
        setSelected(data[0] ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex gap-6 h-full max-w-7xl mx-auto">

      {/* ── Chap: agent kartalar ── */}
      <div className="w-72 shrink-0 flex flex-col gap-3">
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
              onClick={() => { setSelected(agent); setPromptOchiq(false); }}
              className={`w-full text-left p-4 rounded-xl border transition ${
                ROLE_COLOR[agent.role] ?? "bg-gray-800 border-gray-700"
              } ${selected?.id === agent.id ? (ROLE_ACTIVE[agent.role] ?? "ring-2 ring-gray-500") : "hover:brightness-125"}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{ROLE_ICON[agent.role] ?? "🤖"}</span>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm leading-tight">{agent.name}</p>
                  <p className="text-xs text-gray-300 mt-0.5">{ROLE_LABEL[agent.role] ?? agent.role}</p>
                </div>
                <span className={`ml-auto w-2 h-2 rounded-full shrink-0 ${agent.isActive ? "bg-green-400" : "bg-gray-600"}`} />
              </div>
              <p className="text-xs text-gray-400 font-mono truncate">{modelQisqa(agent.model)}</p>
            </button>
          ))
        )}

        {/* Tanlangan agent system prompti */}
        {selected && (
          <div className="mt-2 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <button
              onClick={() => setPromptOchiq((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-gray-400 hover:text-gray-200 transition"
            >
              <span>System prompt</span>
              <span className={`transition-transform ${promptOchiq ? "rotate-180" : ""}`}>▾</span>
            </button>
            {promptOchiq && (
              <div className="px-4 pb-4 max-h-48 overflow-y-auto">
                <pre className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {selected.systemPrompt}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── O'ng: chat ── */}
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
  );
}
