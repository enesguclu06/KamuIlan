/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#0284c7", // Sky 600
          foreground: "#ffffff",
          dark: "#0369a1",
          light: "#e0f2fe",
        },
        secondary: {
          DEFAULT: "#0f172a", // Slate 900
          foreground: "#f8fafc",
        },
        accent: {
          DEFAULT: "#f1f5f9",
          foreground: "#0f172a",
        },
        success: {
          DEFAULT: "#16a34a", // Green 600
          light: "#dcfce7",
          dark: "#15803d",
        },
        warning: {
          DEFAULT: "#eab308", // Yellow 500
          light: "#fef9c3",
          dark: "#ca8a04",
        },
        destructive: {
          DEFAULT: "#ef4444", // Red 500
          light: "#fee2e2",
          dark: "#b91c1c",
        },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
    },
  },
  plugins: [],
};
