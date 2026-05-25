import KnowledgeUploader from "@/components/KnowledgeUploader";

export default function KnowledgePage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">База знаний</h1>
        <p className="text-slate-500 mt-1">
          PDF yoki matn fayllarini yuklang — agentlar ulardan foydalanadi
        </p>
      </div>
      <KnowledgeUploader />
    </div>
  );
}
