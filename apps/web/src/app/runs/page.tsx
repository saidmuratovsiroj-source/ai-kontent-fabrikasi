import RunsPanel from "@/components/RunsPanel";

export default function RunsPage() {
  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Прогоны Роя</h1>
        <p className="text-slate-500 mt-1">
          Mavzu bering — Стратег, Исследователь va Критик birgalikda ishlaydi
        </p>
      </div>
      <RunsPanel />
    </div>
  );
}
