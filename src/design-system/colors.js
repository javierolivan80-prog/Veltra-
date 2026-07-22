// Single source of truth for the Veltra palette.
// Consumed by tailwind.config.js (className styling) and by any JS/TS code
// that needs a raw hex value (SVG charts, gradients, icon fills, chart libs).
const colors = {
  bg: {
    deep: "#090909",
    DEFAULT: "#0B0B0B",
    soft: "#0D0D0D",
  },
  surface: {
    DEFAULT: "#151515",
    raised: "#1A1A1A",
    hover: "#202020",
  },
  line: {
    subtle: "#221F22",
    DEFAULT: "#2A2A2E",
  },
  ink: {
    DEFAULT: "#F5F5F7",
    dim: "#A8A8AE",
    faint: "#6B6B72",
  },
  progress: {
    DEFAULT: "#2CE6A0",
    dim: "#1A8F63",
    bg: "#0E2A21",
  },
  info: {
    DEFAULT: "#4DA3FF",
    dim: "#2E6FC9",
    bg: "#0E2036",
  },
  ai: {
    DEFAULT: "#A374FF",
    dim: "#7A4FE0",
    bg: "#201332",
  },
  warn: {
    DEFAULT: "#FF9548",
    dim: "#C96E2E",
    bg: "#2E1B0C",
  },
  record: {
    DEFAULT: "#FFC94D",
    dim: "#C99A2E",
    bg: "#2E2409",
  },
  danger: {
    DEFAULT: "#FF5470",
    bg: "#2E0E17",
  },
  rank: {
    bronze: "#C67A3E",
    silver: "#C7CDD6",
    gold: "#F5C453",
    platinum: "#7FE3D6",
    diamond: "#8FC7FF",
    elite: "#FF4D8D",
  },
};

module.exports = { colors };
