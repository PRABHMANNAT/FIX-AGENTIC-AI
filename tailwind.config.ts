import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        syne: ["var(--font-syne)", "sans-serif"],
        display: ["var(--font-bebas)", "sans-serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
        comfort: ["var(--font-comfortaa)", "sans-serif"],
      },
      colors: {
        background: "#000000",
        surface: "#0a0a0a",
        "surface-raised": "#111111",
        border: "#1a1a1a",
        "border-subtle": "#0f0f0f",
        accent: "#00ff88",
        danger: "#ff4444",
        warning: "#ffaa00",
        "text-primary": "#ffffff",
        "text-secondary": "#888888",
        "text-muted": "#444444",
        "text-micro": "#333333",
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
      },
      boxShadow: {
        accent: "0 0 0 1px rgba(0,255,136,0.18), 0 0 24px rgba(0,255,136,0.08)",
        live: "0 0 8px #00ff88",
        panel: "inset 0 1px 0 rgba(255,255,255,0.03)",
      },
      backgroundImage: {
        grid:
          "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
        shimmer:
          "linear-gradient(90deg, rgba(17,17,17,1) 0%, rgba(26,26,26,1) 45%, rgba(17,17,17,1) 100%)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        pulse: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.65", transform: "scale(0.92)" },
        },
        drift: {
          "0%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(40px, -24px, 0) scale(1.08)" },
          "100%": { transform: "translate3d(-28px, 36px, 0) scale(0.96)" },
        },
        grain: {
          "0%": { transform: "translate(0, 0)" },
          "25%": { transform: "translate(-1%, 1%)" },
          "50%": { transform: "translate(1%, -1%)" },
          "75%": { transform: "translate(1%, 1%)" },
          "100%": { transform: "translate(0, 0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 300ms ease-out",
        "slide-up": "slide-up 300ms ease-out both",
        shimmer: "shimmer 1.8s linear infinite",
        pulse: "pulse 1.8s ease-in-out infinite",
        drift: "drift 30s ease-in-out infinite alternate",
        grain: "grain 0.5s steps(2) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
