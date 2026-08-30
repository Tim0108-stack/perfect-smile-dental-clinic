/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Inter Tight", "sans-serif"],
      },
      colors: {
        // Matches the existing Perfect Smile clinic application so the
        // legacy HTML app can be migrated in without a visual mismatch.
        slate: {
          50: "#fafafa",
          100: "#f4f4f5",
          150: "#eef0f2",
          200: "#e4e4e7",
          300: "#d4d4d8",
          400: "#a1a1aa",
          500: "#71717a",
          600: "#52525b",
          700: "#3f3f46",
          800: "#27272a",
          900: "#18181b",
        },
        teal: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
        },
      },
      boxShadow: {
        xs: "0 1px 2px rgba(24,24,27,0.04)",
        card: "0 1px 2px rgba(24,24,27,0.04), 0 1px 1px rgba(24,24,27,0.03)",
        pop: "0 4px 12px rgba(24,24,27,0.08), 0 1px 2px rgba(24,24,27,0.04)",
        modal:
          "0 24px 48px -12px rgba(24,24,27,0.24), 0 4px 16px rgba(24,24,27,0.08)",
      },
    },
  },
  plugins: [],
};
