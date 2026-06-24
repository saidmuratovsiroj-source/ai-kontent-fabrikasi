import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import MaqsadHeader from "@/components/MaqsadHeader";
import { ProjectProvider } from "@/contexts/ProjectContext";

export const metadata: Metadata = {
  title: "AI Kontent Fabrikasi",
  description: "Sun'iy intellekt yordamida kontent ishlab chiqarish tizimi",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body className="flex flex-col h-screen overflow-hidden">
        <ProjectProvider>
          <MaqsadHeader />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 p-8 overflow-auto relative">{children}</main>
          </div>
        </ProjectProvider>
      </body>
    </html>
  );
}
