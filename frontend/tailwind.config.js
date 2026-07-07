/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "bg-main": "#F7F6F2",
        coral: "#FF6B6B",
        orange: "#FF9F53",
        teal: "#4ECDC4",
        purple: "#A78BFA",
        yellow: "#FFD166",
        green: "#22C55E",
        navy: "#1E293B",
        muted: "#64748B",
      },
      borderRadius: {
        card: "18px",
      },
      fontFamily: {
        sans: ['"Segoe UI"', '"SF Pro Display"', "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 10px rgba(30, 41, 59, 0.08)",
        "card-lg": "0 8px 24px rgba(30, 41, 59, 0.12)",
      },
    },
  },
  plugins: [],
};
