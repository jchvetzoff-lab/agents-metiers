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
        // Legacy SOJAI Colors (kept for backwards compat)
        purple: {
          DEFAULT: "#4A39C0",
          light: "#6B5DD3",
          dark: "#3A2E9F",
          50: "#F9F8FF",
          100: "#E4E1FF",
        },
        pink: {
          DEFAULT: "#FF3254",
          light: "#FF6B8A",
          dark: "#E62946",
          50: "#FFCCD4",
        },
        // New: Indigo (enriched primary)
        indigo: {
          50: "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
          800: "#3730A3",
          900: "#312E81",
          950: "#1E1B4B",
        },
        // New: Cyan (electric accent)
        cyan: {
          50: "#ECFEFF",
          100: "#CFFAFE",
          200: "#A5F3FC",
          300: "#67E8F9",
          400: "#22D3EE",
          500: "#06B6D4",
          600: "#0891B2",
          700: "#0E7490",
        },
        // New: Coral (warm accent)
        coral: {
          50: "#FFF7ED",
          100: "#FFEDD5",
          200: "#FED7AA",
          300: "#FDBA74",
          400: "#FB923C",
          500: "#F97316",
          600: "#EA580C",
        },
        // Warm grays
        stone: {
          50: "#FAFAF9",
          100: "#F5F5F4",
          200: "#E7E5E4",
          300: "#D6D3D1",
          400: "#A8A29E",
          500: "#78716C",
          600: "#57534E",
          700: "#44403C",
          800: "#292524",
          900: "#1C1917",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)",
        "card-hover": "0 4px 12px rgba(79,70,229,0.08), 0 16px 40px rgba(0,0,0,0.08)",
        "glow-indigo": "0 0 24px rgba(79,70,229,0.25)",
        "glow-cyan": "0 0 24px rgba(6,182,212,0.25)",
        float: "0 20px 60px rgba(0,0,0,0.12)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        float: "float 6s ease-in-out infinite",
        glow: "glow 2s ease-in-out infinite",
        pulse: "pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2s linear infinite",
        "gradient-shift": "gradientShift 8s ease infinite",
        "bounce-subtle": "bounceSubtle 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translate(0, 0)" },
          "25%": { transform: "translate(10px, -10px)" },
          "50%": { transform: "translate(-10px, -20px)" },
          "75%": { transform: "translate(-10px, 10px)" },
        },
        drift: {
          "0%": { transform: "translate(0, 0) rotate(0deg)" },
          "20%": { transform: "translate(15vw, -10vh) rotate(5deg)" },
          "40%": { transform: "translate(-10vw, 15vh) rotate(-5deg)" },
          "60%": { transform: "translate(20vw, 10vh) rotate(3deg)" },
          "80%": { transform: "translate(-15vw, -5vh) rotate(-3deg)" },
          "100%": { transform: "translate(0, 0) rotate(0deg)" },
        },
        colorshift: {
          "0%, 100%": { opacity: "0.8" },
          "25%": { opacity: "1" },
          "50%": { opacity: "0.6" },
          "75%": { opacity: "0.9" },
        },
        glow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(79, 70, 229, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(79, 70, 229, 0.6)" },
        },
        pulse: {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "0.4" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        gradientShift: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        bounceSubtle: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      backgroundImage: {
        "gradient-purple-pink": "linear-gradient(135deg, #4A39C0 0%, #FF3254 100%)",
        "gradient-primary": "linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #EC4899 100%)",
        "gradient-hero": "linear-gradient(135deg, rgba(30,27,75,0.5) 0%, rgba(6,182,212,0.05) 50%, rgba(249,115,22,0.03) 100%)",
        "gradient-cta": "linear-gradient(135deg, #312E81 0%, #0891B2 100%)",
        "gradient-glass": "linear-gradient(135deg, rgba(12,12,26,0.9) 0%, rgba(12,12,26,0.6) 100%)",
        "gradient-radial": "radial-gradient(circle at center, var(--tw-gradient-stops))",
        "gradient-mesh": "linear-gradient(135deg, rgba(30,27,75,0.3) 0%, rgba(99,102,241,0.1) 50%, rgba(236,72,153,0.05) 100%)",
      },
    },
  },
  plugins: [],
} satisfies Config;
