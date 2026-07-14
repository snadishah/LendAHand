/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Monochrome system. The old brand token NAMES are kept (coral, teal,
        // navy, …) and remapped to grayscale so the whole app shifts to
        // black-and-white without touching every component. `ink` = near-black,
        // `paper` = off-white.
        ink: "#0A0A0A",
        paper: "#F4F3EF",
        "bg-main": "#F4F3EF",
        coral: "#0A0A0A", // primary accent → ink
        orange: "#1A1A1A",
        teal: "#3D3D3D",
        purple: "#171717",
        yellow: "#E4E1D8",
        green: "#0A0A0A",
        navy: "#0A0A0A",
        muted: "#7A756B",
      },
      borderRadius: {
        card: "16px",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"Space Grotesk"', "Inter", "ui-sans-serif", "sans-serif"],
        mono: ['"Space Mono"', "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      boxShadow: {
        card: "0 1px 2px rgba(10,10,10,0.04), 0 6px 20px rgba(10,10,10,0.06)",
        "card-lg": "0 10px 40px rgba(10,10,10,0.14)",
        hard: "4px 4px 0 0 #0A0A0A",
        "hard-lg": "8px 8px 0 0 #0A0A0A",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scroll-hint": {
          "0%, 100%": { transform: "translateY(0)", opacity: "0.4" },
          "50%": { transform: "translateY(6px)", opacity: "1" },
        },
      },
      animation: {
        marquee: "marquee 28s linear infinite",
        "fade-up": "fade-up 0.6s ease-out both",
        "scroll-hint": "scroll-hint 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
