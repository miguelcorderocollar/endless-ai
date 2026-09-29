"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { COLOR_OPTIONS } from "@/lib/theme-lab";

const COLOR_KEY = "theme-lab-color";
const HUD_MS = 1800;

function readIndex(key: string, max: number): number {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return 0;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 && n < max ? n : 0;
  } catch {
    return 0;
  }
}

function applyColor(index: number) {
  const option = COLOR_OPTIONS[index];
  if (!option) return;
  const root = document.documentElement;
  root.style.setProperty("color-scheme", option.scheme);
  root.style.setProperty("--color-ink", option.ink);
  root.style.setProperty("--color-ink-raised", option.inkRaised);
  root.style.setProperty("--color-ink-line", option.inkLine);
  root.style.setProperty("--color-paper", option.paper);
  root.style.setProperty("--color-signal", option.signal);
  root.style.setProperty("--color-signal-dim", option.signalDim);
  root.style.setProperty("--color-fail", option.fail);
  root.style.setProperty("--color-muted", option.muted);
  document.body.style.backgroundColor = option.ink;
  document.body.style.color = option.paper;
}

/**
 * Experiment-only overlay: Shift+C cycles colors.
 * Shows a small HUD toast so you know which theme is on screen.
 */
export function ThemeLab() {
  // Intentionally 0 on first render (server + client) so hydration matches;
  // the stored index is applied in the mount effect below.
  const [colorIndex, setColorIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<number | null>(null);

  const poke = useCallback(() => {
    setVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setVisible(false), HUD_MS);
  }, []);

  // Client-only hydration from localStorage (runs after hydration, so no
  // server/client mismatch). The HUD below renders the default until this lands.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setColorIndex(readIndex(COLOR_KEY, COLOR_OPTIONS.length));
    setHydrated(true);
  }, []);

  // Apply on change + persist.
  useEffect(() => {
    applyColor(colorIndex);
    try {
      window.localStorage.setItem(COLOR_KEY, String(colorIndex));
    } catch {
      // ignore
    }
  }, [colorIndex]);

  useEffect(() => {
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (event.key === "C" || event.key === "c") {
        event.preventDefault();
        setColorIndex((prev) => (prev + 1) % COLOR_OPTIONS.length);
        poke();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [poke]);

  const shownColorIndex = hydrated ? colorIndex : 0;
  const color = COLOR_OPTIONS[shownColorIndex] ?? COLOR_OPTIONS[0]!;

  return (
    <div
      aria-hidden={!visible}
      className={`pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="border border-ink-line bg-ink-raised px-4 py-2.5 text-center shadow-xl">
        <p className="label text-paper">
          C {shownColorIndex + 1}/{COLOR_OPTIONS.length} · {color.label}
        </p>
        <p className="label mt-1.5 text-muted">shift+C color</p>
      </div>
    </div>
  );
}
