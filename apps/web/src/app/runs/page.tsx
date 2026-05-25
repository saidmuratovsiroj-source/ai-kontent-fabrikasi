import RunsPanel from "@/components/RunsPanel";

export default function RunsPage({ searchParams }: { searchParams: { topic?: string } }) {
  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Roy yugurishlari</h1>
        <p className="text-slate-500 mt-1">
          Mavzu bering — Strateg, Tadqiqotchi va Tanqidchi birgalikda ishlaydi
        </p>
      </div>
      <RunsPanel initialTopic={searchParams.topic} />
    </div>
  );
}
