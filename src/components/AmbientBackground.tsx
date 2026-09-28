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
};

type Glyph = {
  x: number;
  y: number;
  ch: string;
  size: number;
  alpha: number;
  speed: number;
  phase: number;
  drift: number;
};

const GLYPH_POOL = ["·", "·", "·", ".", ".", ":", ":", "+", "×", "?"] as const;

function randomBlobs(): Blob[] {
  return Array.from({ length: 5 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 0.28 + Math.random() * 0.22,
    ampX: 0.03 + Math.random() * 0.05,
    ampY: 0.03 + Math.random() * 0.05,
    speedX: 0.05 + Math.random() * 0.06,
    speedY: 0.04 + Math.random() * 0.06,
    phaseX: Math.random() * Math.PI * 2,
    phaseY: Math.random() * Math.PI * 2,
    alpha: 0.03 + Math.random() * 0.02,
  }));
}

function randomGlyphs(w: number, h: number): Glyph[] {
  const cell = 88;
  const glyphs: Glyph[] = [];
  for (let gy = cell / 2; gy < h; gy += cell) {
    for (let gx = cell / 2; gx < w; gx += cell) {
      if (Math.random() > 0.28) continue;
      glyphs.push({
        x: gx + (Math.random() - 0.5) * 24,
        y: gy + (Math.random() - 0.5) * 24,
        ch: GLYPH_POOL[Math.floor(Math.random() * GLYPH_POOL.length)]!,
        size: 10 + Math.random() * 4,
        alpha: 0.03 + Math.random() * 0.035,
        speed: 0.15 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
        drift: 2 + Math.random() * 3,
      });
    }
  }
  return glyphs;
}

function makeBlobSprite(): HTMLCanvasElement {
  const s = 256;
  const sprite = document.createElement("canvas");
  sprite.width = s;
  sprite.height = s;
  const ctx = sprite.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(242,239,233,1)");
  g.addColorStop(1, "rgba(242,239,233,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return sprite;
}

/**
 * Barely-there animated backdrop: soft gray blobs and faint ASCII glyphs
 * drifting on near-black. Decorative only — content stays the focus.
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
    let glyphs: Glyph[] = [];
    const sprite = makeBlobSprite();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      glyphs = randomGlyphs(w, h);
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
        ctx.drawImage(sprite, x - r, y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const gl of glyphs) {
        const twinkle = 0.7 + 0.3 * Math.sin(t * gl.speed + gl.phase);
        ctx.globalAlpha = gl.alpha * twinkle;
        ctx.font = `${gl.size}px "IBM Plex Mono", ui-monospace, monospace`;
        ctx.fillStyle = "#f2efe9";
        ctx.fillText(
          gl.ch,
          gl.x + gl.drift * Math.sin(t * gl.speed * 0.6 + gl.phase),
          gl.y + gl.drift * Math.cos(t * gl.speed * 0.5 + gl.phase),
        );
      }
      ctx.globalAlpha = 1;
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      paint(8);
      return () => window.removeEventListener("resize", resize);
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
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
