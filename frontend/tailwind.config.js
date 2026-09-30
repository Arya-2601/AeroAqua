/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aqi: {
          good: "#22c55e",
          satisfactory: "#84cc16",
          moderate: "#eab308",
          poor: "#f97316",
          verypoor: "#ef4444",
          severe: "#7f1d1d"
        },
        navy: {
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617"
        }
      }
    },
  },
  plugins: [],
}
