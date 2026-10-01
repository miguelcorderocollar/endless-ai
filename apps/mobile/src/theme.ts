/**
 * The web app's palette, copied verbatim from `src/app/globals.css` (@theme).
 * Two apps, one palette: if these drift the Play Store build stops looking like
 * the thing people already use on the web, which is the whole reason the app is
 * a wrap rather than a redesign. Change one, change both.
 */
export const colors = {
  ink: "#0a0b0d",
  inkRaised: "#121417",
  inkLine: "#23262b",
  paper: "#f2efe9",
  signal: "#d6ff3f",
  signalDim: "#a4c72f",
  fail: "#ff5a36",
  muted: "#6f7580",
} as const;

/**
 * Font family names registered by `useFonts` in the root layout, from the same
 * Google fonts the web app loads through `next/font`. Native needs them
 * installed as assets; there is no `system-ui` fallback that looks close, and
 * Instrument Serif is the whole character of the thing.
 */
export const fonts = {
  display: "InstrumentSerif_400Regular",
  displayItalic: "InstrumentSerif_400Regular_Italic",
  sans: "IBMPlexSans_400Regular",
  sansMedium: "IBMPlexSans_500Medium",
  sansSemibold: "IBMPlexSans_600SemiBold",
  mono: "IBMPlexMono_400Regular",
  monoMedium: "IBMPlexMono_500Medium",
} as const;

/** The web app's `.label` utility: mono, small, wide tracking, uppercase. */
export const label = {
  fontFamily: fonts.mono,
  fontSize: 11,
  letterSpacing: 1.76,
  textTransform: "uppercase",
} as const;

/** `rise` from globals.css, as a reusable Animated value. 0.4s, same curve. */
export const RISE_DURATION = 400;
export const RISE_CURVE = [0.2, 0.7, 0.2, 1] as const;

/** globals.css `.stagger > *` delays. Index into this for the nth-child delay. */
export const STAGGER_DELAYS = [30, 80, 130, 180, 230, 280] as const;

/** `frame-x` / `frame-b` from globals.css, in dp equivalents. */
export const GUTTER = 20;
export const BOTTOM_INSET = 40;
