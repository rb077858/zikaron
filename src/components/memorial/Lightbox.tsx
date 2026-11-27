"use client";

import { useEffect, useRef } from "react";

/**
 * Full-screen image viewer. Closes on ✕, Escape or a tap on the backdrop;
 * with several images, arrows / keyboard / swipe move between them.
 * The page behind it doesn't scroll while it's open.
 */
export function Lightbox({
  images,
  index,
  onIndexChange,
  onClose,
}: {
  images: string[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const count = images.length;
  const touchX = useRef<number | null>(null);

  // RTL: "next" is to the left.
  const next = () => onIndexChange((index + 1) % count);
  const prev = () => onIndexChange((index - 1 + count) % count);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (count > 1 && e.key === "ArrowLeft") onIndexChange((index + 1) % count);
      else if (count > 1 && e.key === "ArrowRight") onIndexChange((index - 1 + count) % count);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, count, onIndexChange, onClose]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  if (count === 0) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null || count < 2) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) < 40) return;
        if (dx < 0) next();
        else prev();
      }}
      className="lightbox-in fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 sm:p-10"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={images[index]}
        src={images[index]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="lightbox-img max-h-full max-w-full rounded-lg object-contain shadow-2xl"
      />

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="סגירה"
        className="absolute left-4 top-4 flex size-11 items-center justify-center rounded-full bg-white/15 text-xl text-white backdrop-blur transition-colors hover:bg-white/25"
      >
        ✕
      </button>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="התמונה הקודמת"
            className="absolute right-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl text-white backdrop-blur transition-colors hover:bg-white/25"
          >
            ›
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="התמונה הבאה"
            className="absolute left-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl text-white backdrop-blur transition-colors hover:bg-white/25"
          >
            ‹
          </button>
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-sm text-white backdrop-blur" dir="ltr">
            {index + 1} / {count}
          </p>
        </>
      )}
    </div>
  );
}
