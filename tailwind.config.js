const {
  default: flattenColorPalette,
} = require("tailwindcss/lib/util/flattenColorPalette");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        'spektr-cyan': {
          '50': '#e6f8fa',
          '100': '#ccf1f5',
          '200': '#99e3eb',
          '300': '#66d5e1',
          '400': '#33c7d7',
          '500': '#00b9cd',
          '600': '#0094a4',
          '700': '#006f7b',
          '800': '#004a52',
          '900': '#002529',
        },
      },
      animation: {
        aurora: "aurora 60s linear infinite",
        "shimmer-slide": "shimmer-slide calc(var(--speed, 3s)) ease-in-out infinite alternate",
        "spin-around": "spin-around calc(var(--speed, 3s)) linear infinite",
      },
      keyframes: {
        aurora: {
          "0%": {
            backgroundPosition: "50% 50%, 50% 50%",
          },
          "100%": {
            backgroundPosition: "350% 50%, 350% 50%",
          },
        },
        "shimmer-slide": {
          from: {
            transform: "translateX(-100%)",
          },
          to: {
            transform: "translateX(100%)",
          },
        },
        "spin-around": {
          from: {
            transform: "rotate(0deg)",
          },
          to: {
            transform: "rotate(360deg)",
          },
        },
      },
    },
  },
  plugins: [addVariablesForColors],
};

// This plugin adds each Tailwind color as a global CSS variable, e.g. var(--gray-200).
function addVariablesForColors({ addBase, theme }) {
  let allColors = flattenColorPalette(theme("colors"));
  let newVars = Object.fromEntries(
    Object.entries(allColors).map(([key, val]) => [`--${key}`, val])
  );

  // Add additional variables that might be needed
  newVars["--transparent"] = "transparent";
  newVars["--white"] = "#ffffff";
  newVars["--black"] = "#000000";
  newVars["--blue-300"] = "#93c5fd";
  newVars["--blue-400"] = "#60a5fa";
  newVars["--blue-500"] = "#3b82f6";
  newVars["--indigo-300"] = "#a5b4fc";
  newVars["--indigo-600"] = "#4f46e5";
  newVars["--violet-200"] = "#ddd6fe";
  newVars["--purple-400"] = "#c084fc";
  newVars["--pink-600"] = "#db2777";
  newVars["--spektr-cyan-50"] = "#e6f8fa";

  addBase({
    ":root": newVars,
  });
} 