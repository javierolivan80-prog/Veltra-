type ColorScale = { DEFAULT: string; dim?: string; bg?: string; hover?: string; soft?: string; deep?: string; subtle?: string; faint?: string };

export declare const colors: {
  bg: { deep: string; DEFAULT: string; soft: string };
  surface: { DEFAULT: string; raised: string; hover: string };
  line: { subtle: string; DEFAULT: string };
  ink: { DEFAULT: string; dim: string; faint: string };
  progress: ColorScale;
  info: ColorScale;
  ai: ColorScale;
  warn: ColorScale;
  record: ColorScale;
  danger: { DEFAULT: string; bg: string };
  rank: {
    bronze: string;
    silver: string;
    gold: string;
    platinum: string;
    diamond: string;
    elite: string;
  };
};
