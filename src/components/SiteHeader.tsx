"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CandleFlame } from "@/components/CandleFlame";
import { useCurrentUser, signIn, signOutUser, accountUrl, type SiteUser } from "@/lib/use-auth";

const AUTH_ERRORS: Record<string, string> = {
  no_access: "לחשבון הזה אין גישה לאתר. לפרטים פנו אלינו.",
};

export function SiteHeader() {
  const { user, loading, unavailable, error } = useCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <CandleFlame size={26} />
          <span className="text-lg font-bold text-gold-soft">זיכרון</span>
        </Link>

        <nav className="flex min-w-0 items-center gap-2 sm:gap-3">
          {loading ? (
            <span className="size-9 animate-pulse rounded-full bg-surface-2" aria-hidden />
          ) : user ? (
            <>
              <Link
                href="/dashboard"
                className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-foreground/90 hover:text-gold-soft transition-colors sm:px-4"
              >
                דפי ההנצחה שלי
              </Link>
              <UserMenu user={user} />
            </>
          ) : (
            <div className="flex flex-col items-end">
              <button
                onClick={signIn}
                disabled={unavailable}
                className="whitespace-nowrap rounded-full bg-gold px-3 sm:px-4 py-1.5 text-sm font-semibold text-[#1a1206] hover:bg-gold-soft transition-colors disabled:opacity-60"
              >
                התחברות עם reem.bi
              </button>
              {unavailable && (
                <span className="mt-0.5 text-[11px] text-muted">ההתחברות לא זמינה כרגע</span>
              )}
            </div>
          )}
        </nav>
      </div>
      {error && (
        <p className="border-t border-border bg-red-500/10 px-4 py-2 text-center text-sm text-red-500">
          {AUTH_ERRORS[error] ?? "ההתחברות נכשלה. נסו שוב."}
        </p>
      )}
    </header>
  );
}

function Avatar({ user }: { user: SiteUser }) {
  const [broken, setBroken] = useState(false);
  const label = user.name || user.email || "?";
  if (user.avatar && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatar}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="size-9 rounded-full border border-gold/40 object-cover"
      />
    );
  }
  return (
    <span className="flex size-9 items-center justify-center rounded-full border border-gold/40 bg-surface-2 text-sm font-bold text-gold-soft">
      {label.trim().charAt(0).toUpperCase()}
    </span>
  );
}

function UserMenu({ user }: { user: SiteUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const itemClass =
    "block w-full px-4 py-2.5 text-start text-sm text-foreground hover:bg-surface-2 transition-colors";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="תפריט חשבון"
        className="flex items-center gap-2 rounded-full p-0.5 hover:ring-2 hover:ring-gold/40 transition"
      >
        <Avatar user={user} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute end-0 top-full mt-2 w-60 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-semibold">{user.name || user.email}</p>
            {user.name && user.email && (
              <p className="truncate text-xs text-muted" dir="ltr">
                {user.email}
              </p>
            )}
            {user.planName && <p className="mt-1 text-xs text-gold-soft">תוכנית: {user.planName}</p>}
          </div>
          <Link href="/upgrade" className={itemClass} onClick={() => setOpen(false)}>
            החבילה שלי ושדרוג
          </Link>
          <a href={accountUrl()} className={itemClass}>
            החשבון שלי
          </a>
          <button
            onClick={() => {
              setOpen(false);
              void signOutUser();
            }}
            className={`${itemClass} border-t border-border text-muted`}
          >
            התנתקות
          </button>
        </div>
      )}
    </div>
  );
}
