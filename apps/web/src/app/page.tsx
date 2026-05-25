import HealthCheck from "@/components/HealthCheck";
import BudgetBar from "@/components/BudgetBar";

export default function DashboardPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Boshqaruv paneli</h1>
        <p className="text-slate-500 mt-1">Tizim holati va umumiy ko&apos;rinish</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          Tizim holati
        </h2>
        <HealthCheck />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          AI Byudjeti
        </h2>
        <BudgetBar />
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Agentlar",           value: "5", desc: "sozlangan" },
          { label: "Yaratilgan kontent", value: "0", desc: "bu oy" },
          { label: "Vazifalar",          value: "0", desc: "navbatda" },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl border border-slate-200 px-6 py-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{card.value}</p>
            <p className="text-xs text-slate-400 mt-1">{card.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
