import ChatInterface from "@/components/ChatInterface";

export default function AgentsPage() {
  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Агенты</h1>
        <p className="text-slate-500 mt-1">
          Чат со Стратегом — главным планировщиком команды
        </p>
      </div>
      <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 p-6 shadow-sm">
        <ChatInterface />
      </div>
    </div>
  );
}
