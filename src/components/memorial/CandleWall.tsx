"use client";

import { useEffect, useState } from "react";
import { CandleFlame } from "@/components/CandleFlame";
import { formatGregorianDateHe, formatTimeHe } from "@/lib/format";
import type { Candle } from "@/lib/memorials";

// Placed on the left edge of the screen — the conventional spot for
// secondary floating UI (chat widgets, side drawers) on RTL sites, since the
// right side is the primary reading edge.
export function CandleWall({ candles, fullName }: { candles: Candle[]; fullName: string }) {
  const [open, setOpen] = useState(false);

  // Lock page scroll while the wall is open, like any side drawer.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (candles.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`נרות שהודלקו לזכרו/ה של ${fullName} (${candles.length})`}
        className={`fixed inset-y-0 end-0 z-40 flex w-11 flex-col items-center justify-center gap-2 rounded-s-xl border border-e-0 border-border bg-surface/95 py-5 text-gold-soft shadow-[0_0_20px_rgba(0,0,0,0.35)] backdrop-blur-md transition-all hover:w-12 hover:bg-surface-2 sm:inset-y-auto sm:top-1/2 sm:h-auto sm:-translate-y-1/2 ${
          open ? "invisible opacity-0" : "visible opacity-100"
        }`}
      >
        <span className="candle-flame-pulse text-lg leading-none">🕯️</span>
        <span className="text-xs font-bold" style={{ writingMode: "vertical-rl" }}>
          נרות שהודלקו
        </span>
        <span className="flex size-6 items-center justify-center rounded-full bg-gold text-[11px] font-extrabold text-[#1a1206]">
          {candles.length}
        </span>
      </button>

      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="נרות שהודלקו"
      >
        <div
          onClick={() => setOpen(false)}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />

        <aside
          className="absolute inset-y-0 end-0 flex w-[min(92vw,400px)] flex-col overflow-hidden border-s border-border bg-surface shadow-[0_0_60px_rgba(0,0,0,0.6)] transition-transform duration-300 ease-out"
          style={{ transform: open ? "translateX(0)" : "translateX(-100%)" }}
        >
          {/* Drifting embers — purely decorative, behind the content */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {EMBER_POSITIONS.map((left, i) => (
              <span
                key={i}
                className="ember"
                style={{
                  left: `${left}%`,
                  animationDelay: `${(i * 0.9) % 6}s`,
                  animationDuration: `${5 + (i % 4)}s`,
                }}
              />
            ))}
          </div>

          <div className="relative flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-gold-soft">נרות שהודלקו</h2>
              <p className="text-xs text-muted">לזכרו/ה של {fullName}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="סגירה"
              className="flex size-9 items-center justify-center rounded-full border border-border text-lg text-muted transition-colors hover:border-gold hover:text-gold-soft"
            >
              ✕
            </button>
          </div>

          <div className="relative flex-1 overflow-y-auto px-5 py-6">
            <div className="flex flex-col gap-4">
              {candles.map((c, i) => (
                <div
                  key={c.id}
                  className="candle-wall-item section-card flex items-start gap-3 rounded-xl px-4 py-4 text-right transition-all hover:border-gold/50 hover:shadow-[0_0_24px_rgba(212,175,106,0.15)]"
                  style={{ animationDelay: `${Math.min(i, 12) * 60}ms` }}
                >
                  <div className="shrink-0 pt-1">
                    <CandleFlame size={24} />
                  </div>
                  <div className="min-w-0 flex-1">
                    {c.message && (
                      <p className="mb-2.5 leading-6 text-foreground/90">{c.message}</p>
                    )}
                    <div className="gold-divider mb-2.5" />
                    <p className="font-bold text-gold-soft">{c.name}</p>
                    {c.createdAt && (
                      <p className="mt-1 text-xs text-muted">
                        {formatGregorianDateHe(c.createdAt.toDate())} |{" "}
                        {formatTimeHe(c.createdAt.toDate())}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

// Fixed pseudo-random spread so embers don't all rise from the same spot,
// without pulling in a random-number dependency for ten numbers.
const EMBER_POSITIONS = [8, 22, 35, 50, 63, 78, 90, 15, 45, 70];
