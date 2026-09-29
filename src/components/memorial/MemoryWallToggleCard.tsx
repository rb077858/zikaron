"use client";

import { useState } from "react";
import Link from "next/link";
import { useCurrentUser, refreshAccount } from "@/lib/use-auth";
import { disableMemoryWall } from "@/lib/memorials";
import {
  enableMemoryWallViaWorker,
  WorkerRequestError,
  LEGACY_MEMORY_WALL_COST,
} from "@/lib/worker-api";

/**
 * Owner-facing control for the "share a memory" add-on. Both branches rely
 * on the live memorial subscription to re-render the parent page once the
 * change lands — neither needs local "enabled" state of its own.
 */
export function MemoryWallToggleCard({ slug, enabled }: { slug: string; enabled: boolean }) {
  return enabled ? <DisableCard slug={slug} /> : <EnableCard slug={slug} />;
}

function EnableCard({ slug }: { slug: string }) {
  const { user, account } = useCurrentUser();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notInPlan, setNotInPlan] = useState(false);

  const included = account?.memoryWall ?? false;
  const legacyCredits = !included && (account?.credits ?? 0) >= LEGACY_MEMORY_WALL_COST;
  const blocked = account !== null && !included && !legacyCredits;

  async function handleEnable() {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    setNotInPlan(false);
    try {
      await enableMemoryWallViaWorker(slug);
      if (legacyCredits) void refreshAccount();
    } catch (err) {
      if (err instanceof WorkerRequestError && err.code === "NOT_IN_PLAN") {
        setNotInPlan(true);
        setError("שיתוף זיכרון אינו כלול בחבילה שלכם.");
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
        אפשרו למי שמכיר/ה את היקיר/ה לשתף כאן זיכרון, סיפור קטן ותמונות.
        {legacyCredits && (
          <> ההפעלה תנוכה מיתרת הקרדיטים הקודמת שלכם ({LEGACY_MEMORY_WALL_COST} קרדיטים).</>
        )}
        {blocked && <> האפשרות זמינה בחבילה מורחבת.</>}
      </p>
      {error && (
        <p className="mb-3 text-xs text-red-400">
          {error}
          {notInPlan && (
            <>
              {" "}
              <Link href="/upgrade" className="text-gold-soft hover:underline">
                שדרוג החבילה
              </Link>
            </>
          )}
        </p>
      )}
      {blocked ? (
        <Link
          href="/upgrade"
          className="inline-block rounded-full bg-gold px-5 py-2 text-sm font-semibold text-[#1a1206] hover:bg-gold-soft transition-colors"
        >
          שדרוג החבילה
        </Link>
      ) : (
        <button
          onClick={handleEnable}
          disabled={submitting}
          className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-[#1a1206] hover:bg-gold-soft transition-colors disabled:opacity-60"
        >
          {submitting ? "מפעיל..." : "הפעלה"}
        </button>
      )}
    </div>
  );
}

function DisableCard({ slug }: { slug: string }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDisable() {
    setBusy(true);
    setError(null);
    try {
      await disableMemoryWall(slug);
    } catch (err) {
      console.error(err);
      setError("משהו השתבש, נסו שוב.");
      setBusy(false);
    }
  }

  return (
    <div className="section-card w-full max-w-sm rounded-2xl p-5 text-center">
      <p className="mb-1 text-sm font-semibold text-gold-soft">💭 שיתוף זיכרון מופעל</p>
      <p className="mb-4 text-xs leading-5 text-muted">
        אפשר להסיר את האפשרות מהדף. הזיכרונות שכבר שותפו יישמרו, אך לא יוצגו
        עד שתפעילו את האפשרות שוב.
      </p>
      {error && <p className="mb-3 text-xs text-red-400">{error}</p>}
      {confirming ? (
        <>
          <p className="mb-3 text-xs leading-5 text-red-400">
            ⚠ שימו לב: הפעלה מחדש אפשרית רק אם החבילה שלכם <b>כוללת</b> שיתוף זיכרון.
          </p>
          <button
            onClick={handleDisable}
            disabled={busy}
            className="rounded-full border border-red-500/50 px-5 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-60"
          >
            {busy ? "מסיר..." : "כן, הסרת שיתוף הזיכרון"}
          </button>
        </>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-muted transition-colors hover:border-red-500/50 hover:text-red-400"
        >
          הסרת שיתוף זיכרון
        </button>
      )}
    </div>
  );
}
