"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Boshqaruv paneli", href: "/",           icon: "⊞" },
  { label: "Loyihalar",        href: "/projects",   icon: "📁" },
  { label: "Ideyalar",         href: "/ideas",      icon: "💡" },
  { label: "Agentlar",         href: "/agents",     icon: "🤖" },
  { label: "Roy yugurishlari", href: "/runs",       icon: "🚀" },
  { label: "Video papkalari",  href: "/videos",     icon: "🗂️" },
  { label: "Vazifalar",        href: "/tasks",      icon: "📋" },
  { label: "Taqvim",           href: "/takvim",     icon: "📅" },
  { label: "Bilim bazasi",     href: "/knowledge",  icon: "📚" },
  { label: "Kanallar",         href: "/channels",   icon: "📡" },
  { label: "Analitika",        href: "/analytics",  icon: "📊" },
  { label: "Trendlar",         href: "/trends",     icon: "🔥" },
  { label: "Viral videolar",   href: "/viral",      icon: "🎬" },
  { label: "Kontent",          href: "/content",    icon: "📄" },
  { label: "Sozlamalar",       href: "/settings",   icon: "⚙" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-sidebar text-white shrink-0">
      <div className="px-6 py-5 border-b border-slate-700">
        <span className="text-lg font-bold tracking-tight">AI Kontent Fabrikasi</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-accent text-white font-medium"
                  : "text-slate-300 hover:bg-sidebar-hover hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-4 border-t border-slate-700 text-xs text-slate-500">
        v1.0.0
      </div>
    </aside>
  );
}
