"use client";

import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { GoogleIcon } from "@/components/GoogleIcon";
import { useCurrentUser, signInWithGoogle } from "@/lib/use-auth";
import { ADMIN_EMAIL, WorkerRequestError } from "@/lib/credits";
import { adminLookupUser, adminSetCredits, adminSetBlocked, type AdminUserInfo } from "@/lib/admin";

const ERROR_MESSAGES: Record<string, string> = {
  USER_NOT_FOUND: "לא נמצא משתמש עם האימייל הזה.",
  INVALID_INPUT: "קלט לא תקין.",
  FORBIDDEN: "אין לכם הרשאת מנהל.",
  UNAUTHENTICATED: "יש להתחבר מחדש ולנסות שוב.",
  INVALID_TOKEN: "יש להתחבר מחדש ולנסות שוב.",
};

function errorMessage(err: unknown): string {
  if (err instanceof WorkerRequestError) {
    return ERROR_MESSAGES[err.code] ?? "משהו השתבש, נסו שוב.";
  }
  return "משהו השתבש, נסו שוב.";
}

export default function AdminPage() {
  const { user, loading } = useCurrentUser();
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<AdminUserInfo | null>(null);
  const [creditsInput, setCreditsInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !email.trim()) return;
    setSearching(true);
    setError(null);
    setMessage(null);
    setResult(null);
    try {
      const idToken = await user.getIdToken();
      const info = await adminLookupUser(idToken, email.trim());
      setResult(info);
      setCreditsInput(String(info.credits));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSearching(false);
    }
  }

  async function handleSaveCredits() {
    if (!user || !result) return;
    const value = Math.trunc(Number(creditsInput));
    if (!Number.isFinite(value) || value < 0) {
      setError("יש להזין מספר קרדיטים תקין (0 ומעלה).");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const idToken = await user.getIdToken();
      await adminSetCredits(idToken, result.email, value);
      setResult({ ...result, credits: value });
      setMessage(`עודכן ל-${value} קרדיטים.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleBlocked() {
    if (!user || !result) return;
    const next = !result.blocked;
    setBlocking(true);
    setError(null);
    setMessage(null);
    try {
      const idToken = await user.getIdToken();
      await adminSetBlocked(idToken, result.email, next);
      setResult({ ...result, blocked: next });
      setMessage(next ? "המשתמש נחסם." : "החסימה הוסרה.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBlocking(false);
    }
  }

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
          <p className="text-lg text-muted">יש להתחבר כדי לגשת לניהול</p>
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

  if (user.email !== ADMIN_EMAIL) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex flex-1 items-center justify-center px-5 text-center text-muted">
          העמוד הזה מיועד למנהל המערכת בלבד.
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-5 py-10">
        <h1 className="mb-2 text-2xl font-bold text-gold-soft">ניהול משתמשים</h1>
        <p className="mb-8 text-sm text-muted">
          חיפוש משתמש לפי אימייל, עדכון יתרת קרדיטים ידנית, וחסימת חשבונות.
        </p>

        <form onSubmit={handleSearch} className="section-card mb-6 flex gap-2 rounded-2xl p-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="אימייל המשתמש"
            className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground placeholder:text-muted/60 focus:border-gold focus:outline-none"
          />
          <button
            type="submit"
            disabled={searching || !email.trim()}
            className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-[#1a1206] hover:bg-gold-soft transition-colors disabled:opacity-60"
          >
            {searching ? "מחפש..." : "חיפוש"}
          </button>
        </form>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-6 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold-soft">
            {message}
          </div>
        )}

        {result && (
          <div className="section-card rounded-2xl p-6">
            <p className="mb-1 text-sm text-muted">{result.email}</p>
            <p className="mb-6 text-xs text-muted" dir="ltr">
              uid: {result.uid}
            </p>

            <div className="mb-6">
              <label className="mb-1.5 block text-sm font-medium text-muted">יתרת קרדיטים</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  value={creditsInput}
                  onChange={(e) => setCreditsInput(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground focus:border-gold focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveCredits}
                  disabled={saving}
                  className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-[#1a1206] hover:bg-gold-soft transition-colors disabled:opacity-60"
                >
                  {saving ? "שומר..." : "שמירה"}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  סטטוס חשבון:{" "}
                  <span className={result.blocked ? "text-red-500" : "text-gold-soft"}>
                    {result.blocked ? "חסום" : "פעיל"}
                  </span>
                </p>
                {result.blocked && (
                  <p className="mt-1 text-xs text-muted">המשתמש לא יכול להתחבר מחדש.</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleToggleBlocked}
                disabled={blocking}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
                  result.blocked
                    ? "border-gold hover:bg-gold/10 text-gold-soft"
                    : "border-red-500/50 text-red-500 hover:bg-red-500/10"
                }`}
              >
                {blocking ? "מעדכן..." : result.blocked ? "ביטול חסימה" : "חסימת משתמש"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
