import { useEffect, useRef, useState } from "react";
import { Image, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { usePrefersReducedMotion } from "@/components/rise";
import { colors } from "@/theme";

/**
 * `AmbientBackground.tsx` and the `body::after` grain from `globals.css`, on a
 * phone. Both are decorative and neither takes a touch, so the content is never
 * obscured — that is the only brief they have.
 *
 * The blobs are the interesting half. The web draws them to a canvas with a
 * pre-rendered radial-gradient sprite; `react-native-svg` has no equivalent of
 * a canvas sprite, but it does have `RadialGradient`, so each blob is a circle
 * filled with the same falloff. Same five blobs, same radii, amplitudes, speeds
 * and phases, same ~0.028 alpha — so the backdrop is the same backdrop, not a
 * lookalike.
 *
 * The grain is the part that could not be matched and was. `globals.css` uses an
 * `feTurbulence` data URI, and `react-native-svg` implements no filters at all,
 * so a live version was never an option. Instead `npm run assets:grain` bakes
 * the noise once into a 120x120 tileable PNG and this overlays it at the same
 * 0.035 opacity over the same area. Generated rather than hand-drawn, so it is
 * noise rather than a pattern — which is the whole point of it.
 */
type Blob = {
  x: number;
  y: number;
  r: number;
  ampX: number;
  ampY: number;
  speedX: number;
  speedY: number;
  phaseX: number;
  phaseY: number;
  alpha: number;
};

function randomBlobs(): Blob[] {
  return Array.from({ length: 5 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 0.28 + Math.random() * 0.22,
    ampX: 0.05 + Math.random() * 0.07,
    ampY: 0.05 + Math.random() * 0.07,
    speedX: 0.07 + Math.random() * 0.08,
    speedY: 0.06 + Math.random() * 0.08,
    phaseX: Math.random() * Math.PI * 2,
    phaseY: Math.random() * Math.PI * 2,
    alpha: 0.028 + Math.random() * 0.018,
  }));
}

/** The same slow, wandering loop the web runs: sin in x, cos in y. */
function paint(blobs: Blob[], t: number, w: number, h: number) {
  const m = Math.min(w, h);
  return blobs.map((b) => ({
    cx: (b.x + b.ampX * Math.sin(t * b.speedX + b.phaseX)) * w,
    cy: (b.y + b.ampY * Math.cos(t * b.speedY + b.phaseY)) * h,
    r: b.r * m,
    alpha: b.alpha,
    id: `${b.phaseX}-${b.phaseY}`,
  }));
}

export function Ambient() {
  const { width, height } = useWindowDimensions();
  const reduced = usePrefersReducedMotion();
  const blobs = useRef<Blob[]>(null);
  if (blobs.current === null) blobs.current = randomBlobs();
  // Frozen frame, and the one the web paints for reduced motion (t = 8, not 0,
  // so the composition is as settled as the animated one ever gets).
  const [frozen] = useState(() => paint(blobs.current!, 8, width, height));
  const [frame, setFrame] = useState(frozen);

  useEffect(() => {
    if (reduced) {
      setFrame(paint(blobs.current!, 8, width, height));
      return;
    }
    // 20fps is plenty for a backdrop that moves a few pixels a second, and it
    // is a JS-driven loop: the web's is a canvas at display rate, which would
    // cost far more here for motion nobody consciously sees.
    const started = Date.now();
    const timer = setInterval(() => {
      setFrame(
        paint(blobs.current!, (Date.now() - started) / 1000, width, height),
      );
    }, 50);
    return () => clearInterval(timer);
  }, [reduced, width, height]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" aria-hidden>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="blob" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colors.paper} stopOpacity={1} />
            <Stop offset="1" stopColor={colors.paper} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {frame.map((b) => (
          <Circle
            key={b.id}
            cx={b.cx}
            cy={b.cy}
            r={b.r}
            fill="url(#blob)"
            opacity={b.alpha}
          />
        ))}
      </Svg>
      <Image
        source={require("../../assets/images/grain.png")}
        // `resizeMode="repeat"` is what makes it a tile rather than one stretched
        // square, which is the difference between noise and a smudge.
        style={styles.grain}
        resizeMode="repeat"
        fadeDuration={0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // `body::after` in globals.css: inset 0, opacity 0.035, above the content
  // layer, no pointer events.
  grain: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.035,
  },
});
