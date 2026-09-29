"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SignInPrompt } from "@/components/SignInPrompt";
import { useCurrentUser } from "@/lib/use-auth";
import { CONTACT_EMAIL } from "@/lib/worker-api";

export default function UpgradePage() {
  const { user, loading, account } = useCurrentUser();

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
        <SignInPrompt message="כדי לראות את החבילה שלכם יש להתחבר תחילה" />
      </div>
    );
  }

  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("שדרוג חבילה באתר זיכרון")}`;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-5 py-10">
        <h1 className="mb-2 text-2xl font-bold text-gold-soft">החבילה שלי</h1>
        <p className="mb-8 text-sm text-muted">
          עריכת דף קיים תמיד חינמית. כדי ליצור דפים נוספים או להוסיף שיתוף זיכרון, אפשר לשדרג
          את החבילה.
        </p>

        <div className="section-card mb-6 rounded-2xl p-6">
          {user.planName && (
            <p className="mb-4 text-sm">
              תוכנית: <span className="font-bold text-gold-soft">{user.planName}</span>
            </p>
          )}
          {account ? (
            <ul className="space-y-2 text-sm">
              <li>
                דפי הנצחה:{" "}
                <span className="font-bold">
                  {account.maxMemorials === null
                    ? `${account.memorialCount} (ללא הגבלה)`
                    : `${account.memorialCount} מתוך ${account.maxMemorials}`}
                </span>
              </li>
              <li>
                שיתוף זיכרון:{" "}
                <span className="font-bold">{account.memoryWall ? "כלול" : "לא כלול"}</span>
              </li>
              {account.credits > 0 && (
                <li>
                  יתרת קרדיטים מרכישה קודמת: <span className="font-bold">{account.credits}</span>
                </li>
              )}
            </ul>
          ) : (
            <p className="text-sm text-muted">לא הצלחנו לטעון את פרטי החבילה כרגע.</p>
          )}
        </div>

        <div className="section-card rounded-2xl p-6 text-center">
          <h2 className="mb-2 text-lg font-bold text-gold-soft">רוצים לשדרג?</h2>
          <p className="mb-5 text-sm leading-6 text-muted">
            השדרוג נעשה באופן אישי. כתבו לנו ונחזור אליכם.
          </p>
          <a
            href={mailto}
            className="inline-block rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-[#1a1206] hover:bg-gold-soft transition-colors"
          >
            פנייה לשדרוג
          </a>
          <p className="mt-3 text-xs text-muted" dir="ltr">
            {CONTACT_EMAIL}
          </p>
        </div>

        <p className="mt-8 text-center text-sm">
          <Link href="/dashboard" className="text-gold-soft hover:underline">
            חזרה לדפי ההנצחה שלי
          </Link>
        </p>
      </main>
    </div>
  );
}
