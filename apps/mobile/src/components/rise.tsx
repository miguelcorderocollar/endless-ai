import { useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing } from "react-native";

import { RISE_CURVE, RISE_DURATION, STAGGER_DELAYS } from "@/theme";

/**
 * globals.css honours `prefers-reduced-motion` by dropping the animations
 * entirely. React Native has no `useReducedMotion` hook, so this mirrors it off
 * `AccessibilityInfo`, which is the same setting under the same name.
 *
 * Starts `false` and resolves after mount, so the first frame is never blocked
 * on an async read — the animation is a nicety and a late-arriving `true` just
 * means the rise is skipped.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (live) setReduced(on);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => {
      live = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}

/**
 * `globals.css`'s `.rise` and `.stagger > *` as React Native values: a 10dp
 * upward fade over 0.4s on the same cubic-bezier(0.2, 0.7, 0.2, 1).
 *
 * Built on RN's `Animated` rather than Reanimated on purpose. This is the only
 * motion in the app so far and it is a one-shot fade on mount; pulling in a
 * worklet runtime and its Babel step for it would add a build-time failure mode
 * to the first pass of a new app for no visible gain. `prefers-reduced-motion`
 * is honoured via `useReducedMotion` from the caller.
 */
const CURVE = Easing.bezier(...RISE_CURVE);

export function useRise(delay = 0, enabled = true) {
  const progress = useRef(new Animated.Value(enabled ? 0 : 1)).current;

  useEffect(() => {
    if (!enabled) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: RISE_DURATION,
      delay,
      easing: CURVE,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, enabled, progress]);

  return {
    opacity: progress,
    transform: [
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
    ],
  };
}

/** Wraps one child in the rise, keyed so a new question replays it. */
export function Rise({
  children,
  delay = 0,
  enabled = true,
}: {
  children: ReactNode;
  delay?: number;
  enabled?: boolean;
}) {
  return (
    <Animated.View style={useRise(delay, enabled)}>
      {children}
    </Animated.View>
  );
}

/**
 * The per-child delay for `stagger > *:nth-child(n)`. The web CSS has six
 * rules; a seventh child simply reuses the last delay rather than inventing one.
 */
export function staggerDelay(index: number): number {
  return STAGGER_DELAYS[index] ?? STAGGER_DELAYS[STAGGER_DELAYS.length - 1]!;
}
