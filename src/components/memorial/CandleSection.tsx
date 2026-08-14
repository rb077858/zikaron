"use client";

import { useState } from "react";
import { CandleFlame } from "@/components/CandleFlame";
import { addCandle, type Memorial } from "@/lib/memorials";

export function CandleSection({
  memorial,
  fullName,
  candlesCount,
}: {
  memorial: Memorial;
  fullName: string;
  candlesCount: number;
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

        {candlesCount > 0 && (
          <p className="mt-6 text-sm text-muted">
            🕯️ {candlesCount} נרות כבר דלוקים לזכרו/ה — לצפייה בכולם לחצו על הלשונית בצד המסך
          </p>
        )}
      </div>
    </section>
  );
}
