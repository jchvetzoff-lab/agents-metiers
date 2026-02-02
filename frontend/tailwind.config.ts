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
        // SOJAI Colors
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
      },
      fontFamily: {
        sans: ["var(--font-inter)"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        "float": "float 6s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite",
        "pulse": "pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
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
          "0%, 100%": { boxShadow: "0 0 20px rgba(74, 57, 192, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(74, 57, 192, 0.6)" },
        },
        pulse: {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "0.4" },
        },
      },
      backgroundImage: {
        "gradient-purple-pink": "linear-gradient(135deg, #4A39C0 0%, #FF3254 100%)",
        "gradient-radial": "radial-gradient(circle at center, var(--tw-gradient-stops))",
        "gradient-mesh": "linear-gradient(135deg, #F9F8FF 0%, #E4E1FF 50%, #FFCCD4 100%)",
      },
    },
  },
  plugins: [],
} satisfies Config;
