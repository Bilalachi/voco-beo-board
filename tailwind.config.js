/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        honey: {
          50: "#FFFBEB",
          100: "#FFF3C4",
          300: "#FFDE70",
          500: "#F2B705",
          600: "#D99A00",
          700: "#A97600",
        },
        petrol: {
          50: "#EAF3F4",
          100: "#CFE3E6",
          300: "#5F97A0",
          500: "#0F4C5C",
          600: "#0C3C49",
          700: "#092C36",
          900: "#061C22",
        },
        ink: {
          DEFAULT: "#15191C",
          soft: "#565E64",
          faint: "#8A9199",
        },
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        honeycomb:
          "radial-gradient(circle at 1px 1px, rgba(15,76,92,0.08) 1px, transparent 0)",
      },
    },
  },
  plugins: [],
};
