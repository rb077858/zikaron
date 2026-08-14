"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { MemorialCard } from "@/components/MemorialCard";
import { useCurrentUser, signInWithGoogle } from "@/lib/use-auth";
import { getUserMemorials, type Memorial } from "@/lib/memorials";
import { GoogleIcon } from "@/components/GoogleIcon";

export default function DashboardPage() {
  const { user, loading } = useCurrentUser();
  const [memorials, setMemorials] = useState<Memorial[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getUserMemorials(user.uid).then((list) => {
      if (!cancelled) setMemorials(list);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex flex-1 items-center justify-center text-muted">טוען...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
          <p className="text-lg text-muted">כדי לצפות בדפי ההנצחה שלכם יש להתחבר תחילה</p>
          <button
            onClick={() => signInWithGoogle()}
            className="flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-[#1a1206] hover:bg-gold-soft transition-colors"
          >
            <GoogleIcon className="size-4" />
            התחברות עם Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gold-soft">דפי ההנצחה שלי</h1>
            <p className="mt-1 text-sm text-muted">שלום {user.displayName || user.email}</p>
          </div>
          <Link
            href="/create"
            className="rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-[#1a1206] hover:bg-gold-soft transition-colors"
          >
            + יצירת דף הנצחה חדש
          </Link>
        </div>

        {memorials === null ? (
          <p className="text-muted">טוען דפים...</p>
        ) : memorials.length === 0 ? (
          <div className="section-card flex flex-col items-center gap-4 rounded-2xl px-6 py-16 text-center">
            <span className="text-4xl">🕯️</span>
            <p className="text-muted">עדיין לא יצרתם דף הנצחה.</p>
            <Link
              href="/create"
              className="rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-[#1a1206] hover:bg-gold-soft transition-colors"
            >
              יצירת דף ראשון
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {memorials.map((m) => (
              <MemorialCard
                key={m.slug}
                memorial={m}
                onDeleted={(slug) =>
                  setMemorials((prev) => prev?.filter((x) => x.slug !== slug) ?? null)
                }
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
