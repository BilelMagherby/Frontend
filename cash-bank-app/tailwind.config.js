/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#1E3A5F",
        accent: "#2E86AB",
        canvas: "#F4F6F9",
      },
      fontFamily: {
        sans: ["Inter", "Cairo", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 12px rgba(20, 44, 75, 0.06)",
      },
    },
  },
  plugins: [],
};
