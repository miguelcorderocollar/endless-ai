"use client";

import { useEffect, useRef } from "react";

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
  tone: "paper" | "signal";
};

function randomBlobs(): Blob[] {
  const blobs: Blob[] = Array.from({ length: 6 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 0.3 + Math.random() * 0.25,
    ampX: 0.05 + Math.random() * 0.07,
    ampY: 0.05 + Math.random() * 0.07,
    speedX: 0.07 + Math.random() * 0.08,
    speedY: 0.06 + Math.random() * 0.08,
    phaseX: Math.random() * Math.PI * 2,
    phaseY: Math.random() * Math.PI * 2,
    alpha: 0.05 + Math.random() * 0.05,
    tone: "paper" as const,
  }));
  // One accent-tinted blob so the theme color drifts through the backdrop.
  blobs[0]!.tone = "signal";
  return blobs;
}

function makeBlobSprite(color: string): HTMLCanvasElement {
  const s = 256;
  const sprite = document.createElement("canvas");
  sprite.width = s;
  sprite.height = s;
  const ctx = sprite.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, toRgba(color, 1));
  g.addColorStop(1, toRgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return sprite;
}

/** Active theme colors, so the blobs belong to the current theme. */
function themeColor(varName: "--color-paper" | "--color-signal"): string {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  return raw || "#f2efe9";
}

function toRgba(color: string, alpha: number): string {
  const match = color.match(/^#([0-9a-f]{6})$/i);
  if (!match?.[1]) return `rgba(242,239,233,${alpha})`;
  const n = Number.parseInt(match[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Barely-there animated backdrop: soft round blobs drifting on near-black.
 * Decorative only — content stays the focus.
 */
export function AmbientBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    const blobs = randomBlobs();
    let sprites = {
      paper: makeBlobSprite(themeColor("--color-paper")),
      signal: makeBlobSprite(themeColor("--color-signal")),
    };

    // ThemeLab swaps CSS variables on <html> when cycling themes — retint.
    const observer = new MutationObserver(() => {
      sprites = {
        paper: makeBlobSprite(themeColor("--color-paper")),
        signal: makeBlobSprite(themeColor("--color-signal")),
      };
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style"],
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const paint = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const m = Math.min(w, h);
      for (const b of blobs) {
        const x = (b.x + b.ampX * Math.sin(t * b.speedX + b.phaseX)) * w;
        const y = (b.y + b.ampY * Math.cos(t * b.speedY + b.phaseY)) * h;
        const r = b.r * m;
        ctx.globalAlpha = b.alpha;
        ctx.drawImage(sprites[b.tone], x - r, y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      paint(8);
      return () => {
        observer.disconnect();
        window.removeEventListener("resize", resize);
      };
    }

    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      paint((now - start) / 1000);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
}
