/**
 * Font + color lab for experimentation (experiment branch only).
 *
 * Cycle with Shift+F (font) and Shift+C (color). Indexes persist in
 * localStorage so a refresh keeps the current combo.
 *
 * Fonts: removed — staying with the original Instrument Serif + Plex stack.
 * (Font cycling was dropped; see issue #24.)
 *
 * Colors: all dark, taken from the Omarchy themes installed on this
 * machine (~/.local/share/omarchy/themes/<name>/colors.toml) and named
 * after them. Token mapping: ink=background, inkRaised=lighter_background,
 * inkLine=selection, paper=foreground, signal=accent, fail=red,
 * muted=lighter of (muted, dark_foreground) for readable micro-labels,
 * signalDim=color-mix of accent into background (unused in UI today).
 *
 * Fail rule: `fail` must stay unmistakable next to `signal` (correct vs
 * wrong answer share the screen). Where the theme's own red is too close
 * to its accent (same hue family, e.g. peach signal + tomato fail) or the
 * theme has no real red (mono themes), fail is overridden with a clear
 * red. Enforced by `isErrorDistinct` + theme-lab.test.ts.
 */

export type ColorOption = {
  id: string;
  label: string;
  scheme: "dark" | "light";
  ink: string;
  inkRaised: string;
  inkLine: string;
  paper: string;
  signal: string;
  signalDim: string;
  fail: string;
  muted: string;
};

function dim(accent: string, background: string): string {
  return `color-mix(in srgb, ${accent} 62%, ${background})`;
}

type RawColor = Omit<ColorOption, "signalDim">;

function withDim(option: RawColor): ColorOption {
  return { ...option, signalDim: dim(option.signal, option.ink) };
}

/**
 * Returns true when `fail` reads as an unmistakable error next to `signal`.
 * Catches the two reported failure modes: same-hue-family pairs (peach
 * signal + tomato fail) and achromatic pairs (gray + gray on mono themes).
 * See theme-lab.test.ts — the reported pairs are pinned as must-be-false.
 */
export function isErrorDistinct(signalHex: string, failHex: string): boolean {
  const a = toHsl(signalHex);
  const b = toHsl(failHex);
  if (!a || !b) return false;

  const satDiff = Math.abs(a.s - b.s);
  const lightDiff = Math.abs(a.l - b.l);

  // Either side achromatic (mono themes): hue is meaningless, so demand a
  // big saturation or lightness gap.
  if (a.s < 12 || b.s < 12) return satDiff >= 45 || lightDiff >= 45;

  const hueDist = Math.min(
    Math.abs(a.h - b.h),
    360 - Math.abs(a.h - b.h),
  );
  if (hueDist < 8) return false;
  return hueDist >= 20 || lightDiff >= 12 || satDiff >= 40;
}

function toHsl(hex: string): { h: number; s: number; l: number } | null {
  const match = hex.match(/^#([0-9a-f]{6})$/i);
  if (!match?.[1]) return null;
  const n = Number.parseInt(match[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = ((max + min) / 2) * 100;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = (d / (l > 50 ? 2 - max - min : max + min)) * 100;
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return { h, s, l };
}

const RAW_COLORS: RawColor[] = [
  {
    id: "signal-lime",
    label: "Current (lime signal on ink)",
    scheme: "dark",
    ink: "#0a0b0d",
    inkRaised: "#121417",
    inkLine: "#23262b",
    paper: "#f2efe9",
    signal: "#d6ff3f",
    fail: "#ff5a36",
    muted: "#6f7580",
  },
  {
    id: "quotes-ink",
    label: "Quotes site dark (#ff8561 on black)",
    scheme: "dark",
    ink: "#000000",
    inkRaised: "#111111",
    inkLine: "#3a3a3a",
    paper: "#d3d3d3",
    signal: "#ff8561",
    fail: "#e03131",
    muted: "#aaaaaa",
  },
  {
    id: "tokyo-night",
    label: "Tokyo Night",
    scheme: "dark",
    ink: "#1a1b26",
    inkRaised: "#24283b",
    inkLine: "#292e42",
    paper: "#a9b1d6",
    signal: "#7aa2f7",
    fail: "#f7768e",
    muted: "#565f89",
  },
  {
    id: "catppuccin",
    label: "Catppuccin",
    scheme: "dark",
    ink: "#1e1e2e",
    inkRaised: "#313244",
    inkLine: "#45475a",
    paper: "#cdd6f4",
    signal: "#89b4fa",
    fail: "#f38ba8",
    muted: "#6c7086",
  },
  {
    id: "gruvbox",
    label: "Gruvbox",
    scheme: "dark",
    ink: "#282828",
    inkRaised: "#3c3836",
    inkLine: "#504945",
    paper: "#d4be98",
    signal: "#7daea3",
    fail: "#ea6962",
    muted: "#7c6f64",
  },
  {
    id: "kanagawa",
    label: "Kanagawa",
    scheme: "dark",
    ink: "#1f1f28",
    inkRaised: "#223249",
    inkLine: "#363646",
    paper: "#dcd7ba",
    signal: "#dcd7ba",
    fail: "#c34043",
    muted: "#727169",
  },
  {
    id: "nord",
    label: "Nord",
    scheme: "dark",
    ink: "#2e3440",
    inkRaised: "#3b4252",
    inkLine: "#434c5e",
    paper: "#d8dee9",
    signal: "#81a1c1",
    fail: "#bf616a",
    muted: "#667080",
  },
  {
    id: "everforest",
    label: "Everforest",
    scheme: "dark",
    ink: "#2d353b",
    inkRaised: "#343f44",
    inkLine: "#3d484d",
    paper: "#d3c6aa",
    signal: "#7fbbb3",
    fail: "#e67e80",
    muted: "#4f585e",
  },
  {
    id: "osaka-jade",
    label: "Osaka Jade",
    scheme: "dark",
    ink: "#111c18",
    inkRaised: "#23372b",
    inkLine: "#32473b",
    paper: "#c1c497",
    signal: "#509475",
    fail: "#ff5345",
    muted: "#81b8a8",
  },
  {
    id: "miasma",
    label: "Miasma",
    scheme: "dark",
    ink: "#222222",
    inkRaised: "#2c2c2c",
    inkLine: "#383838",
    paper: "#c2c2b0",
    signal: "#78824b",
    fail: "#b36d43",
    muted: "#666666",
  },
  {
    id: "matte-black",
    label: "Matte Black",
    scheme: "dark",
    ink: "#121212",
    inkRaised: "#1e1e1e",
    inkLine: "#2a2a2a",
    paper: "#bebebe",
    signal: "#e68e0d",
    fail: "#d35f5f",
    muted: "#555555",
  },
  {
    id: "vantablack",
    label: "Vantablack",
    scheme: "dark",
    ink: "#000000",
    inkRaised: "#1a1a1a",
    inkLine: "#1a1a1a",
    paper: "#ffffff",
    signal: "#ffffff",
    fail: "#ff3b30",
    muted: "#7a7a7a",
  },
  {
    id: "ethereal",
    label: "Ethereal",
    scheme: "dark",
    ink: "#060b1e",
    inkRaised: "#131a3a",
    inkLine: "#252e56",
    paper: "#ffcead",
    signal: "#7d82d9",
    fail: "#ed5b5a",
    muted: "#6d7db6",
  },
  {
    id: "lumon",
    label: "Lumon",
    scheme: "dark",
    ink: "#16242d",
    inkRaised: "#1b2d40",
    inkLine: "#243d56",
    paper: "#d6e2ee",
    signal: "#8bc9eb",
    fail: "#ff6b6b",
    muted: "#4d86b0",
  },
  {
    id: "retro-82",
    label: "Retro 82",
    scheme: "dark",
    ink: "#05182e",
    inkRaised: "#0a2540",
    inkLine: "#134e5a",
    paper: "#f6dcac",
    signal: "#faa968",
    fail: "#e03131",
    muted: "#3f8f8a",
  },
  {
    id: "ristretto",
    label: "Ristretto",
    scheme: "dark",
    ink: "#2c2525",
    inkRaised: "#3d2f2a",
    inkLine: "#403e41",
    paper: "#e6d9db",
    signal: "#f38d70",
    fail: "#e03131",
    muted: "#72696a",
  },
  {
    id: "solitude",
    label: "Solitude",
    scheme: "dark",
    ink: "#101315",
    inkRaised: "#101315",
    inkLine: "#343d41",
    paper: "#cacccc",
    signal: "#798186",
    fail: "#de6145",
    muted: "#4b4e55",
  },
  {
    id: "hackerman",
    label: "Hackerman",
    scheme: "dark",
    ink: "#0b0c16",
    inkRaised: "#151828",
    inkLine: "#1f253a",
    paper: "#ddf7ff",
    signal: "#82fb9c",
    fail: "#ff5252",
    muted: "#6a6e95",
  },
  {
    id: "last-horizon",
    label: "Last Horizon",
    scheme: "dark",
    ink: "#0c0b0c",
    inkRaised: "#0c0b0c",
    inkLine: "#584e51",
    paper: "#fafcfb",
    signal: "#b59790",
    fail: "#ff6b6b",
    muted: "#584e51",
  },
  {
    id: "mono-dark-distortion",
    label: "Mono Dark Distortion",
    scheme: "dark",
    ink: "#050300",
    inkRaised: "#1e1c1a",
    inkLine: "#ebe4d2",
    paper: "#ebe4d2",
    signal: "#c6ab60",
    fail: "#df90a8",
    muted: "#b0ab9e",
  },
];

export const COLOR_OPTIONS: ColorOption[] = RAW_COLORS.map(withDim);
