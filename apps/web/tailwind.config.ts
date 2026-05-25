import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sidebar: "#0f172a",
        "sidebar-hover": "#1e293b",
        accent: "#6366f1",
      },
    },
  },
  plugins: [],
};

export default config;
