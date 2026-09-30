import { Image, StyleSheet, View } from "react-native";

/**
 * The film grain from `body::after` in `globals.css`: a 120x120 noise tile,
 * repeated over the whole app at 3.5% opacity, taking no touches.
 *
 * It is here because `feTurbulence` is a filter and React Native has no canvas
 * to run one in, so the same noise is generated — fractal value noise, three
 * octaves at 0.9 base frequency, sampled on a torus so the tile repeats without
 * a seam — and baked into a PNG by `npm run assets:grain`.
 *
 * This file used to also draw the drifting blob backdrop from the web's
 * `AmbientBackground`. That is gone from both apps, and the reason is worth
 * recording: a soft radial ramp is exactly the case where 8-bit output bands,
 * and on a good screen it read as concentric rings rather than a soft glow. SVG
 * gradients filled their bounding boxes flat on a real device, and a baked
 * sprite with the banding dithered away still looked like rings. A backdrop
 * that cannot be made to look like nothing is worse than no backdrop, so the
 * blobs came out of the web layout too. The grain stayed: it is noise, so it
 * does not band, and it is the half that gave the dark areas their texture.
 *
 * Useful side effect: with no animation loop running, the app is idle when
 * nothing is happening, which is what lets `adb shell uiautomator dump` settle.
 */
export function Grain() {
  return (
    // Wrapped rather than given `pointerEvents`: this RN version does not take
    // that prop on `Image`, and the wrapper does the same job for the whole
    // subtree.
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
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
  grain: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.035,
  },
});
