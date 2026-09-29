"use client";

import { SiteHeader } from "@/components/SiteHeader";
import { MemorialForm } from "@/components/MemorialForm";
import { useCurrentUser } from "@/lib/use-auth";
import { SignInPrompt } from "@/components/SignInPrompt";

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
        <SignInPrompt message="כדי ליצור דף הנצחה יש להתחבר תחילה" />
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
