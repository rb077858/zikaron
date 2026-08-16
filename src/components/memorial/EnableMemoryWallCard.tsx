"use client";

import { useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/lib/use-auth";
import { enableMemoryWallViaWorker, MEMORY_WALL_COST, InsufficientCreditsError } from "@/lib/credits";

/**
 * Shown to the page owner only while memoryWallEnabled is still false. Once
 * the Worker flips it, the live memorial subscription re-renders the parent
 * page and this card is simply no longer included — no local "enabled"
 * state needed here.
 */
export function EnableMemoryWallCard({ slug }: { slug: string }) {
  const { user } = useCurrentUser();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insufficientCredits, setInsufficientCredits] = useState(false);

  async function handleEnable() {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    setInsufficientCredits(false);
    try {
      const idToken = await user.getIdToken();
      await enableMemoryWallViaWorker(idToken, slug);
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        setInsufficientCredits(true);
        setError(`אין מספיק קרדיטים (יש לכם ${err.credits}, נדרשים ${MEMORY_WALL_COST}).`);
      } else {
        console.error(err);
        setError("משהו השתבש, נסו שוב.");
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="section-card w-full max-w-sm rounded-2xl p-5 text-center">
      <p className="mb-1 text-sm font-semibold text-gold-soft">💭 הוספת שיתוף זיכרון</p>
      <p className="mb-4 text-xs leading-5 text-muted">
        אפשרו למי שמכיר/ה את היקיר/ה לשתף כאן זיכרון, סיפור קטן ותמונות. תוספת
        חד-פעמית לדף הזה בעלות {MEMORY_WALL_COST} קרדיטים.
      </p>
      {error && (
        <p className="mb-3 text-xs text-red-400">
          {error}
          {insufficientCredits && (
            <>
              {" "}
              <Link href="/credits" className="text-gold-soft hover:underline">
                רכישת קרדיטים
              </Link>
            </>
          )}
        </p>
      )}
      <button
        onClick={handleEnable}
        disabled={submitting}
        className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-[#1a1206] hover:bg-gold-soft transition-colors disabled:opacity-60"
      >
        {submitting ? "מפעיל..." : `הפעלה (${MEMORY_WALL_COST} קרדיטים)`}
      </button>
    </div>
  );
}
