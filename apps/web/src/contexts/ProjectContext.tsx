"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Project = {
  id: string;
  name: string;
  emoji: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { runs: number; ideas: number; videoFolders: number };
};

type ProjectContextType = {
  activeProject: Project | null;
  projects: Project[];
  setActiveProject: (p: Project | null) => void;
  reloadProjects: () => void;
};

const ProjectContext = createContext<ProjectContextType>({
  activeProject: null,
  projects: [],
  setActiveProject: () => {},
  reloadProjects: () => {},
});

const LS_KEY = "activeProjectId";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);

  async function load() {
    try {
      const res = await fetch(`${API}/api/projects`);
      const data: Project[] = await res.json();
      setProjects(data);

      const savedId = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
      const found = savedId ? data.find((p) => p.id === savedId) ?? null : null;
      setActiveProjectState(found);
    } catch {
      // API offline bo'lsa, bo'sh holat
    }
  }

  useEffect(() => { load(); }, []);

  function setActiveProject(p: Project | null) {
    setActiveProjectState(p);
    if (typeof window !== "undefined") {
      if (p) localStorage.setItem(LS_KEY, p.id);
      else   localStorage.removeItem(LS_KEY);
    }
  }

  return (
    <ProjectContext.Provider value={{ activeProject, projects, setActiveProject, reloadProjects: load }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  return useContext(ProjectContext);
}
