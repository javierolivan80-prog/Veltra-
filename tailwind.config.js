const { colors } = require("./src/design-system/colors");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors,
      fontFamily: {
        display: ["SpaceGrotesk_700Bold"],
        "display-medium": ["SpaceGrotesk_500Medium"],
        body: ["Inter_400Regular"],
        "body-medium": ["Inter_500Medium"],
        "body-semibold": ["Inter_600SemiBold"],
        "body-bold": ["Inter_700Bold"],
        mono: ["SpaceGrotesk_500Medium"],
      },
      borderRadius: {
        xl2: "28px",
      },
    },
  },
  plugins: [],
};
