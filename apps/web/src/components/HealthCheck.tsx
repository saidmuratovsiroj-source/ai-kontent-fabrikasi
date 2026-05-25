"use client";

import { useEffect, useState } from "react";

type HealthStatus = {
  status: "ok" | "error" | "yuklanyapti";
  timestamp?: string;
  database?: string;
};

export default function HealthCheck() {
  const [health, setHealth] = useState<HealthStatus>({ status: "yuklanyapti" });

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/health");
        const data = await res.json();
        setHealth(data);
      } catch {
        setHealth({ status: "error", database: "ulanib bo'lmadi" });
      }
    };

    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, []);

  const colors = {
    ok:          "bg-green-100 text-green-800 border-green-200",
    error:       "bg-red-100 text-red-800 border-red-200",
    yuklanyapti: "bg-yellow-100 text-yellow-800 border-yellow-200",
  };

  const dots = {
    ok:          "bg-green-500",
    error:       "bg-red-500",
    yuklanyapti: "bg-yellow-500 animate-pulse",
  };

  return (
    <div className={`inline-flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${colors[health.status]}`}>
      <span className={`w-2.5 h-2.5 rounded-full ${dots[health.status]}`} />
      <div>
        <p className="font-semibold">
          Backend:{" "}
          {health.status === "ok"
            ? "Ulandi"
            : health.status === "error"
            ? "Ulanmadi"
            : "Tekshirilmoqda..."}
        </p>
        {health.database && (
          <p className="text-xs opacity-75">Ma&apos;lumotlar bazasi: {health.database}</p>
        )}
        {health.timestamp && (
          <p className="text-xs opacity-60">
            {new Date(health.timestamp).toLocaleTimeString("uz-UZ")}
          </p>
        )}
      </div>
    </div>
  );
}
