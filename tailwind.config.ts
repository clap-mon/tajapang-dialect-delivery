import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#4f46e5",
          hover: "#4338ca",
        },
        secondary: "#fbbf24",
        accent: "#f43f5e",
        classroom: {
          bg: "#f0f9ff",
          chalkboard: "#1e3a2d",
          wood: "#78350f",
        }
      },
    },
  },
  plugins: [],
};
export default config;
