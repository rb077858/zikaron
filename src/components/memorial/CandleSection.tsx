"use client";

import { useState } from "react";
import { CandleFlame } from "@/components/CandleFlame";
import { addCandle, type Candle, type Memorial } from "@/lib/memorials";
import { formatGregorianDateHe, formatTimeHe } from "@/lib/format";

export function CandleSection({
  memorial,
  fullName,
  candles,
}: {
  memorial: Memorial;
  fullName: string;
  candles: Candle[];
}) {
  const slug = memorial.slug;
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justLit, setJustLit] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("יש להזין שם");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await addCandle(slug, name, message, {
        ownerId: memorial.ownerId,
        published: memorial.published,
      });
      setName("");
      setMessage("");
      setJustLit(true);
      setTimeout(() => setJustLit(false), 3000);
    } catch {
      setError("לא הצלחנו להדליק את הנר, נסו שוב");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="candle" className="scroll-mt-nav px-5 py-14 text-center">
      <div className="mx-auto flex max-w-lg flex-col items-center">
        <CandleFlame size={64} />
        <p className="mt-6 text-lg leading-8 text-foreground/90">
          נר לזכרו/ה של {fullName} דלוק ומחכה. הדליקו נר, ציינו את שמכם והוסיפו
          מילה לזכרו/ה.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 w-full space-y-3 text-right">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="השם שלכם"
            className="w-full rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-center placeholder:text-muted/60 focus:border-gold focus:outline-none"
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="מילים לזכרו/ה (לא חובה)"
            className="min-h-20 w-full resize-y rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-center placeholder:text-muted/60 focus:border-gold focus:outline-none"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-gold px-6 py-3 text-base font-semibold text-[#1a1206] hover:bg-gold-soft transition-colors disabled:opacity-60"
          >
            {submitting ? "מדליק נר..." : justLit ? "הנר דלוק, תודה 🕯️" : "הדלקת נר לזכרו/ה"}
          </button>
        </form>
      </div>

      {candles.length > 0 && (
        <div className="mx-auto mt-14 max-w-lg">
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="gold-divider flex-1" />
            <span className="text-sm font-medium text-muted">
              {candles.length} נרות דלוקים לזכרו/ה
            </span>
            <div className="gold-divider flex-1" />
          </div>
          <div className="flex flex-col gap-4">
            {candles.map((c) => (
              <div
                key={c.id}
                className="section-card group flex items-start gap-4 rounded-xl px-5 py-4 text-right transition-all hover:border-gold/50 hover:shadow-[0_0_24px_rgba(212,175,106,0.12)]"
              >
                <div className="shrink-0 pt-1">
                  <CandleFlame size={26} />
                </div>
                <div className="min-w-0 flex-1">
                  {c.message && (
                    <p className="mb-3 leading-7 text-foreground/90">{c.message}</p>
                  )}
                  <div className="gold-divider mb-3" />
                  <p className="font-bold text-gold-soft">{c.name}</p>
                  {c.createdAt && (
                    <p className="mt-1 text-xs text-muted">
                      הדליק/ה נר ב-{formatGregorianDateHe(c.createdAt.toDate())} |{" "}
                      {formatTimeHe(c.createdAt.toDate())}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
