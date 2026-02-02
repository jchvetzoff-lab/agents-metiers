import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design System SOJAI
        primary: {
          purple: "#4A39C0",
          pink: "#FF3254",
        },
        background: {
          light: "#F9F8FF",
          white: "#FFFFFF",
        },
        badge: {
          purple: "#E4E1FF",
        },
        text: {
          dark: "#1A1A2E",
          muted: "rgba(26, 26, 46, 0.7)",
        },
        border: {
          subtle: "rgba(0, 0, 0, 0.08)",
          hover: "rgba(74, 57, 192, 0.2)",
        },
      },
      borderRadius: {
        card: "24px",
        pill: "100px",
      },
      fontFamily: {
        sans: ["var(--font-inter)"],
        serif: ["var(--font-playfair)"],
      },
    },
  },
  plugins: [],
} satisfies Config;
