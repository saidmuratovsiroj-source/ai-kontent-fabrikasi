"use client";

import { useState, useRef, useEffect } from "react";
import ChatMessage from "./ChatMessage";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type AgentInfo = {
  id: string;
  name: string;
  role: string;
};

const WELCOME: Message = {
  role: "assistant",
  content:
    "Привет! Я Стратег — главный оркестратор команды AI-агентов.\n\nГотов помочь создать контент-план, распределить задачи между агентами и провести тебя от идеи до готового материала.\n\nС чего начнём? 🚀",
};

export default function ChatInterface() {
  const [messages, setMessages]   = useState<Message[]>([WELCOME]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [agent, setAgent]         = useState<AgentInfo | null>(null);
  const [usage, setUsage]         = useState<{ inputTokens: number; outputTokens: number } | null>(null);
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const textareaRef               = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message  = { role: "user", content: text };
    const history           = messages.filter((m) => m !== WELCOME);
    const nextHistory       = [...history, userMsg];

    setMessages([WELCOME, ...nextHistory]);
    setInput("");
    setLoading(true);

    try {
      const res  = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: nextHistory }),
      });
      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `⚠️ Xato: ${data.error}` },
        ]);
      } else {
        setAgent(data.agent);
        setUsage(data.usage);
        setMessages((prev) => [...prev, data.message as Message]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Server bilan bog'lanib bo'lmadi." },
      ]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([WELCOME]);
    setUsage(null);
    setAgent(null);
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-4rem)]">

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-sm">
            С
          </div>
          <div>
            <p className="font-semibold text-slate-900">
              {agent?.name ?? "Стратег"}
            </p>
            <p className="text-xs text-slate-500">
              Планировщик · claude-opus-4-7
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {usage && (
            <span className="text-xs text-slate-400">
              {usage.inputTokens + usage.outputTokens} токенов
            </span>
          )}
          <button
            onClick={clearChat}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
          >
            Очистить
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map((msg, i) => (
          <ChatMessage
            key={i}
            role={msg.role}
            content={msg.content}
            agentName={msg.role === "assistant" ? (agent?.name ?? "Стратег") : undefined}
          />
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-end gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
              С
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Напишите сообщение... (Enter — отправить, Shift+Enter — новая строка)"
            rows={2}
            disabled={loading}
            className="flex-1 resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm
              focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent
              disabled:opacity-50 disabled:bg-slate-50 placeholder:text-slate-400"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="shrink-0 w-11 h-11 rounded-xl bg-indigo-500 hover:bg-indigo-600
              disabled:opacity-40 disabled:cursor-not-allowed
              flex items-center justify-center transition-colors"
            aria-label="Отправить"
          >
            <svg className="w-5 h-5 text-white rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2 text-center">
          Стратег отвечает на русском языке · Anthropic Claude Opus
        </p>
      </div>
    </div>
  );
}
