"use client";

import Link from "next/link";
import { CandleFlame } from "@/components/CandleFlame";
import { GoogleIcon } from "@/components/GoogleIcon";
import { useCurrentUser, signInWithGoogle, signOutUser } from "@/lib/use-auth";
import { subscribeToCredits, ADMIN_EMAIL } from "@/lib/credits";
import { useEffect, useState } from "react";

export function SiteHeader() {
  const { user, loading } = useCurrentUser();
  const [busy, setBusy] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToCredits(user.uid, setCredits);
    return () => unsub();
  }, [user]);

  async function handleSignIn() {
    setBusy(true);
    try {
      await signInWithGoogle();
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2">
          <CandleFlame size={26} />
          <span className="text-lg font-bold text-gold-soft">זיכרון</span>
        </Link>

        <nav className="flex items-center gap-3">
          {loading ? null : user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-full px-4 py-1.5 text-sm font-medium text-foreground/90 hover:text-gold-soft transition-colors"
              >
                דפי ההנצחה שלי
              </Link>
              {user.email === ADMIN_EMAIL ? (
                <Link
                  href="/admin"
                  className="rounded-full border border-gold/40 px-4 py-1.5 text-sm font-medium text-gold-soft hover:border-gold transition-colors"
                >
                  ⚙️ ניהול
                </Link>
              ) : (
                <Link
                  href="/credits"
                  className="rounded-full border border-gold/40 px-4 py-1.5 text-sm font-medium text-gold-soft hover:border-gold transition-colors"
                >
                  🪙 {credits ?? "…"} קרדיטים
                </Link>
              )}
              <button
                onClick={() => signOutUser()}
                className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-muted hover:text-foreground hover:border-gold transition-colors"
              >
                התנתקות
              </button>
            </>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={busy}
              className="flex items-center gap-2 rounded-full bg-gold px-4 py-1.5 text-sm font-semibold text-[#1a1206] hover:bg-gold-soft transition-colors disabled:opacity-60"
            >
              <GoogleIcon className="size-4" />
              התחברות
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
