import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#050b26",
          900: "#0a1338",
          800: "#0f1b4d",
          700: "#152363",
          600: "#1c2f83",
          500: "#26409f"
        },
        gold: {
          400: "#facc15",
          500: "#eab308",
          600: "#ca8a04"
        },
        panel: {
          DEFAULT: "#0a1746",
          light: "#132466",
          border: "#1e3a8a"
        },
        brand: {
          red: "#c4302b",
          green: "#16a34a"
        }
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Rajdhani", "Inter", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 40px rgba(250,204,21,0.25)",
        card: "0 10px 30px rgba(0,0,0,0.35)"
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(250,204,21,0.55)" },
          "50%": { boxShadow: "0 0 0 14px rgba(250,204,21,0)" }
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        "pulse-glow": "pulse-glow 1.8s ease-out infinite",
        "slide-in": "slide-in 0.35s ease-out both"
      }
    }
  },
  plugins: []
};

export default config;
