"use client";

import { useState, useRef, useEffect } from "react";
import ChatMessage from "./ChatMessage";

type Message = { role: "user" | "assistant"; content: string };
type AgentInfo = { id: string; name: string; role: string; model: string };

const STRATEG_ID = "00000000-0000-0000-0000-000000000001";

function xushkeldiMatin(agentName: string): string {
  return `Salom! Men — ${agentName}.\n\nSizga kontent yaratishda yordam berishga tayyorman. Nima bilan boshlashni xohlaysiz? 🚀`;
}

export default function ChatInterface({ agentId = STRATEG_ID }: { agentId?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [agent,    setAgent]    = useState<AgentInfo | null>(null);
  const [usage,    setUsage]    = useState<{ inputTokens: number; outputTokens: number } | null>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // agentId o'zgarganda chatni tozalab, xushkeldi yuboramiz
  useEffect(() => {
    setMessages([]);
    setUsage(null);
    setAgent(null);
    setInput("");
  }, [agentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const history = [...messages, userMsg];

    setMessages(history);
    setInput("");
    setLoading(true);

    try {
      const res  = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: history, agentId }),
      });
      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ Xato: ${data.error}` }]);
      } else {
        setAgent(data.agent);
        setUsage(data.usage);
        setMessages((prev) => [...prev, data.message as Message]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Server bilan bog'lanib bo'lmadi." }]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const agentNomi = agent?.name ?? "Agent";
  const modelNomi = agent?.model?.replace("anthropic/", "").replace("openai/", "") ?? "";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-700 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {agentNomi.slice(0, 1)}
          </div>
          <div>
            <p className="font-semibold text-white">{agentNomi}</p>
            {modelNomi && <p className="text-xs text-gray-400">{modelNomi}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {usage && (
            <span className="text-xs text-gray-500">
              {(usage.inputTokens + usage.outputTokens).toLocaleString()} token
            </span>
          )}
          <button
            onClick={() => { setMessages([]); setUsage(null); }}
            className="text-xs text-gray-500 hover:text-gray-300 transition px-3 py-1.5 rounded-lg hover:bg-gray-700"
          >
            Tozalash
          </button>
        </div>
      </div>

      {/* Xabarlar */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-10 text-gray-500 text-sm">
            <div className="text-3xl mb-2">💬</div>
            <p>Xabar yozing — agent javob beradi</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage
            key={i}
            role={msg.role}
            content={msg.content}
            agentName={msg.role === "assistant" ? agentNomi : undefined}
          />
        ))}
        {loading && (
          <div className="flex items-end gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {agentNomi.slice(0, 1)}
            </div>
            <div className="bg-gray-700 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Xabar yozing... (Enter — yuborish, Shift+Enter — yangi qator)"
            rows={2}
            disabled={loading}
            className="flex-1 resize-none rounded-xl border border-gray-600 bg-gray-700 text-white px-4 py-3 text-sm
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
              disabled:opacity-50 placeholder:text-gray-500"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="shrink-0 w-11 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500
              disabled:opacity-40 disabled:cursor-not-allowed
              flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5 text-white rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
