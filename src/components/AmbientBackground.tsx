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
    const sprite = makeBlobSprite();

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
        ctx.drawImage(sprite, x - r, y - r, r * 2, r * 2);
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
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
}
