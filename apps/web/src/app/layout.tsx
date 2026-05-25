import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "AI Kontent Fabrikasi",
  description: "Sun'iy intellekt yordamida kontent ishlab chiqarish tizimi",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </body>
    </html>
  );
}
