"use client";

import { SiteHeader } from "@/components/SiteHeader";
import { MemorialForm } from "@/components/MemorialForm";
import { useCurrentUser, signInWithGoogle } from "@/lib/use-auth";
import { GoogleIcon } from "@/components/GoogleIcon";

export default function CreatePage() {
  const { user, loading } = useCurrentUser();

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
          <p className="text-lg text-muted">כדי ליצור דף הנצחה יש להתחבר תחילה</p>
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
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <h1 className="mb-8 text-2xl font-bold text-gold-soft">יצירת דף הנצחה חדש</h1>
        <MemorialForm mode="create" />
      </main>
    </div>
  );
}
