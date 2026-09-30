import { StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Defs, Image as SvgImage, Pattern, Rect } from "react-native-svg";

/**
 * The film grain from `body::after` in `globals.css`: a 120x120 noise tile,
 * repeated over the whole app at 3.5% opacity, taking no touches.
 *
 * It is here because `feTurbulence` is a filter and React Native has no canvas
 * to run one in, so the same noise is generated — fractal value noise, three
 * octaves at 0.9 base frequency, sampled on a torus so the tile repeats without
 * a seam — and baked into a PNG by `npm run assets:grain`.
 *
 * Tiled with an SVG `<Pattern>`, not `resizeMode="repeat"`. Repeat rendered a
 * single 315px tile at the origin and nothing anywhere else — outside that
 * corner the pixels were exactly `(10,11,13)`, pure ink, so on a good screen
 * the top-left showed a faint square that was not on any other part of the
 * display. A pattern tiles by spec: the tile repeats every 120 user units over
 * a rect measured in full-screen dp, so coverage is total by construction
 * rather than by a resize mode that may or may not tile on a given build.
 *
 * This file used to also draw the drifting blob backdrop from the web's
 * `AmbientBackground`. That is gone from both apps, and the reason is worth
 * recording: a soft radial ramp is exactly the case where 8-bit output bands,
 * and on a good screen it read as concentric rings rather than a soft glow. A
 * backdrop that cannot be made to look like nothing is worse than no backdrop,
 * so the blobs came out of the web layout too. The grain stayed: it is noise,
 * so it does not band, and it is the half that gave the dark areas their
 * texture.
 */
export function Grain() {
  const { width, height } = useWindowDimensions();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <Pattern
            id="grain"
            width={120}
            height={120}
            patternUnits="userSpaceOnUse"
          >
            <SvgImage
              href={require("../../assets/images/grain.png")}
              x={0}
              y={0}
              width={120}
              height={120}
              preserveAspectRatio="none"
            />
          </Pattern>
        </Defs>
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill="url(#grain)"
          opacity={0.035}
        />
      </Svg>
    </View>
  );
}
