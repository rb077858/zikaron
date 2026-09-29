"use client";

import { signIn, useCurrentUser } from "@/lib/use-auth";

/** Full-page "please sign in" state, shared by every page that needs a user. */
export function SignInPrompt({ message }: { message: string }) {
  const { unavailable } = useCurrentUser();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
      <p className="text-lg text-muted">{message}</p>
      <button
        onClick={signIn}
        disabled={unavailable}
        className="rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-[#1a1206] hover:bg-gold-soft transition-colors disabled:opacity-60"
      >
        התחברות
      </button>
      {unavailable && (
        <p className="text-xs text-muted">ההתחברות אינה זמינה כרגע. נסו שוב מאוחר יותר.</p>
      )}
    </div>
  );
}
