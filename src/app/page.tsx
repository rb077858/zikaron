"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { CandleFlame } from "@/components/CandleFlame";
import { GoogleIcon } from "@/components/GoogleIcon";
import { useCurrentUser, signInWithGoogle } from "@/lib/use-auth";

const FEATURES = [
  {
    title: "יצירה בכמה דקות",
    body: "טופס אחד פשוט וברור — שם, תאריכים, תמונות וסיפור חיים — והדף שלכם מוכן.",
    icon: "✍️",
  },
  {
    title: "ברקוד למצבה",
    body: "כל דף מקבל קישור וברקוד ייחודיים, מוכנים להדפסה ולהדבקה על המצבה.",
    icon: "▦",
  },
  {
    title: "קיר נרות ותגובות",
    body: "בני משפחה וחברים יכולים להדליק נר דיגיטלי ולהשאיר מילים לזכרו.",
    icon: "🕯️",
  },
  {
    title: "עיצוב מכובד ויפהפה",
    body: "עמוד נקי ומרגש, עם תאריך עברי, יום השנה הבא ואפשרות שיתוף בלחיצה.",
    icon: "✦",
  },
];

const STEPS = [
  { n: "1", t: "מתחברים עם חשבון Google" },
  { n: "2", t: "רוכשים קרדיטים (5 קרדיטים = דף אחד)" },
  { n: "3", t: "ממלאים את פרטי היקיר/ה ומעלים תמונות" },
  { n: "4", t: "מקבלים קישור וברקוד להדפסה על המצבה" },
];

export default function Home() {
  const { user } = useCurrentUser();
  const [busy, setBusy] = useState(false);

  async function handleStart() {
    if (user) return;
    setBusy(true);
    try {
      await signInWithGoogle();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden px-5 py-20 text-center">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(circle at 50% 0%, rgba(212,175,106,0.18), transparent 60%)",
            }}
          />
          <div className="relative mx-auto max-w-2xl">
            <div className="mb-6 flex justify-center">
              <CandleFlame size={72} />
            </div>
            <h1 className="text-4xl font-extrabold leading-tight text-gold-soft sm:text-5xl">
              דף הנצחה דיגיטלי,
              <br />
              לזכר נצח
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-lg leading-8 text-muted">
              צרו בכמה דקות דף זיכרון מכובד ויפהפה ליקירכם — עם תמונות, סיפור
              חיים, קיר נרות ותאריך אזכרה — וקבלו ברקוד להדבקה על המצבה.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3">
              {user ? (
                <Link
                  href="/dashboard"
                  className="rounded-full bg-gold px-7 py-3 text-base font-semibold text-[#1a1206] shadow-lg shadow-gold/20 transition-colors hover:bg-gold-soft"
                >
                  מעבר לדפי ההנצחה שלי
                </Link>
              ) : (
                <button
                  onClick={handleStart}
                  disabled={busy}
                  className="flex items-center gap-2 rounded-full bg-gold px-7 py-3 text-base font-semibold text-[#1a1206] shadow-lg shadow-gold/20 transition-colors hover:bg-gold-soft disabled:opacity-60"
                >
                  <GoogleIcon className="size-5" />
                  התחברות עם Google והתחלה
                </button>
              )}
              <span className="text-sm text-muted">
                ההתחברות חינמית · יצירת דף עולה 5 קרדיטים (5 ₪)
              </span>
            </div>
          </div>
        </section>

        <div className="gold-divider mx-auto max-w-3xl" />

        {/* Features */}
        <section className="mx-auto max-w-5xl px-5 py-16">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="section-card rounded-2xl p-6 text-center"
              >
                <div className="mb-3 text-3xl">{f.icon}</div>
                <h3 className="mb-2 font-bold text-gold-soft">{f.title}</h3>
                <p className="text-sm leading-6 text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-3xl px-5 py-16 text-center">
          <h2 className="mb-10 text-2xl font-bold text-gold-soft">איך זה עובד</h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="flex flex-col items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-full border border-gold text-lg font-bold text-gold">
                  {s.n}
                </div>
                <p className="text-sm leading-6 text-muted">{s.t}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-5 py-8 text-center text-sm text-muted">
        <p>זיכרון · דפי הנצחה דיגיטליים · נבנה באהבה ובכבוד</p>
      </footer>
    </div>
  );
}
