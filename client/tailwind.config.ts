import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#f9fafb",
        foreground: "#111827",
        card: "#ffffff",
        "card-foreground": "#1f2937",
        border: "#e5e7eb",
        input: "#f3f4f6",
        "input-foreground": "#111827",
        primary: "#3b82f6",
        "primary-foreground": "#ffffff",
        muted: "#f3f4f6",
        "muted-foreground": "#6b7280",
        accent: "#f472b6",
        "accent-foreground": "#ffffff",
        destructive: "#ef4444",
      },
    },
  },
  plugins: [],
};
export default config;
