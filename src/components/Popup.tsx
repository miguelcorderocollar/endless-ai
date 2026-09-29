"use client";

import { useEffect, useRef } from "react";

/**
 * Shared popup: dimmed overlay, centered sharp-cornered panel, × to close.
 * Escape and overlay clicks close it; the first field autofocuses; background
 * scroll locks while open. Static when reduced motion is preferred.
 */
export function Popup({
  label,
  title,
  onClose,
  children,
}: {
  label: string;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current
      ?.querySelector<HTMLElement>("input, button[type='submit']")
      ?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="rise w-full max-w-sm border border-ink-line bg-ink-raised p-6"
      >
        <div className="flex items-baseline justify-between">
          <p className="label text-muted">{label}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="close"
            className="label cursor-pointer text-muted transition-colors hover:text-signal"
          >
            ×
          </button>
        </div>
        <h2 className="mt-2 font-display text-2xl">{title}</h2>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
