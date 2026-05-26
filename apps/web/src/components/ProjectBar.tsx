"use client";

import { useState } from "react";
import { useProject } from "@/contexts/ProjectContext";

export default function ProjectBar() {
  const { activeProject, projects, setActiveProject } = useProject();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-100 border border-gray-700 transition"
      >
        <span>{activeProject ? activeProject.emoji : "🌐"}</span>
        <span className="max-w-[140px] truncate">
          {activeProject ? activeProject.name : "Barcha loyihalar"}
        </span>
        <span className="text-gray-400">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <button
            onClick={() => { setActiveProject(null); setOpen(false); }}
            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-800 flex items-center gap-2 ${!activeProject ? "bg-gray-800 text-indigo-400" : "text-gray-300"}`}
          >
            <span>🌐</span> Barcha loyihalar
          </button>
          <div className="border-t border-gray-700" />
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => { setActiveProject(p); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-800 flex items-center gap-2 ${activeProject?.id === p.id ? "bg-gray-800 text-indigo-400" : "text-gray-300"}`}
            >
              <span>{p.emoji}</span>
              <span className="truncate">{p.name}</span>
            </button>
          ))}
          <div className="border-t border-gray-700" />
          <a
            href="/projects"
            className="block px-4 py-2.5 text-sm text-gray-500 hover:text-gray-300 hover:bg-gray-800"
            onClick={() => setOpen(false)}
          >
            + Loyihalarni boshqarish
          </a>
        </div>
      )}
    </div>
  );
}
