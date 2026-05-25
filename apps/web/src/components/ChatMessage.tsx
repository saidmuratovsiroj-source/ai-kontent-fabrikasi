type Props = {
  role: "user" | "assistant";
  content: string;
  agentName?: string;
};

export default function ChatMessage({ role, content, agentName }: Props) {
  const isUser = role === "user";

  return (
    <div className={`flex items-end gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
          isUser ? "bg-indigo-500" : "bg-slate-700"
        }`}
      >
        {isUser ? "Вы" : (agentName?.[0] ?? "С")}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[72%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-indigo-500 text-white rounded-br-sm"
            : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm"
        }`}
      >
        {!isUser && agentName && (
          <p className="text-xs font-semibold text-indigo-600 mb-1">{agentName}</p>
        )}
        {content}
      </div>
    </div>
  );
}
