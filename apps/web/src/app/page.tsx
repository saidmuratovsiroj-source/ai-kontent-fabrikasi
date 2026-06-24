"use client";

import { useState, useEffect } from "react";
import HealthCheck from "@/components/HealthCheck";
import BudgetBar from "@/components/BudgetBar";
import TestPanel from "@/components/TestPanel";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function DashboardPage() {
  const [kontentSon, setKontentSon] = useState<string>("...");
  const [vazifaSon, setVazifaSon]   = useState<string>("...");

  useEffect(() => {
    const buOyBoshlash = new Date();
    buOyBoshlash.setDate(1);
    buOyBoshlash.setHours(0, 0, 0, 0);

    fetch(`${API}/api/runs`)
      .then((r) => r.json())
      .then((runs: unknown) => {
        if (Array.isArray(runs)) {
          const son = (runs as { createdAt?: string }[]).filter(
            (r) => r.createdAt && new Date(r.createdAt) >= buOyBoshlash
          ).length;
          setKontentSon(String(son));
        }
      })
      .catch(() => setKontentSon("–"));

    fetch(`${API}/api/tasks`)
      .then((r) => r.json())
      .then((malumot: unknown) => {
        if (Array.isArray(malumot)) {
          const navbatda = (malumot as { status?: string }[]).filter(
            (t) => t.status === "TODO" || t.status === "IN_PROGRESS"
          ).length;
          setVazifaSon(String(navbatda));
        }
      })
      .catch(() => setVazifaSon("–"));
  }, []);

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

      <TestPanel />

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Agentlar",           value: "5",        desc: "sozlangan" },
          { label: "Yaratilgan kontent", value: kontentSon, desc: "bu oy" },
          { label: "Vazifalar",          value: vazifaSon,  desc: "navbatda" },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl border border-slate-200 px-6 py-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className={`text-3xl font-bold mt-1 ${card.value === "..." ? "text-slate-300 animate-pulse" : "text-slate-900"}`}>
              {card.value}
            </p>
            <p className="text-xs text-slate-400 mt-1">{card.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
