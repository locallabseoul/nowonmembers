import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#22c55e",
        primaryHover: "#16a34a",
        primaryLight: "#f0fdf4",
        primaryBorder: "#dcfce7",
        charcoal: "#0f172a",
        ink: "#111827",
        warm: "#f8fafc",
        surface: "#f8fafc",
        surfaceAlt: "#f1f5f9",
        line: "#e2e8f0"
      },
      boxShadow: {
        soft: "0 10px 30px rgba(15, 23, 42, 0.08)",
        green: "0 20px 40px rgba(34, 197, 94, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
