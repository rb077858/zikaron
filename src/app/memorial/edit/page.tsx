"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { MemorialForm } from "@/components/MemorialForm";
import { useCurrentUser, signInWithGoogle } from "@/lib/use-auth";
import { GoogleIcon } from "@/components/GoogleIcon";
import { getMemorialBySlug, subscribeToPhotos, type Memorial, type Photo } from "@/lib/memorials";

function EditMemorialPageInner() {
  const slug = useSearchParams().get("slug") ?? "";
  const { user, loading: authLoading } = useCurrentUser();
  const [memorial, setMemorial] = useState<Memorial | null | undefined>(undefined);
  const [photos, setPhotos] = useState<Photo[]>([]);

  useEffect(() => {
    if (!slug) return;
    getMemorialBySlug(slug).then(setMemorial);
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const unsub = subscribeToPhotos(slug, setPhotos);
    return () => unsub();
  }, [slug]);

  if (!slug || authLoading || memorial === undefined) {
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
          <p className="text-lg text-muted">כדי לערוך דף הנצחה יש להתחבר תחילה</p>
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

  if (!memorial) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex flex-1 items-center justify-center text-muted">הדף לא נמצא</div>
      </div>
    );
  }

  if (memorial.ownerId !== user.uid) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 text-center">
          <p className="text-lg text-muted">אין לכם הרשאה לערוך דף זה</p>
          <Link href={`/memorial?slug=${encodeURIComponent(slug)}`} className="text-gold-soft hover:underline">
            חזרה לדף ההנצחה
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <h1 className="mb-8 text-2xl font-bold text-gold-soft">
          עריכת דף ההנצחה של {memorial.firstName} {memorial.lastName}
        </h1>
        <MemorialForm
          mode="edit"
          slug={slug}
          initial={{
            firstName: memorial.firstName,
            lastName: memorial.lastName,
            fatherName: memorial.fatherName ?? "",
            motherName: memorial.motherName ?? "",
            spouseName: memorial.spouseName ?? "",
            childrenNames: memorial.childrenNames ?? "",
            occupation: memorial.occupation ?? "",
            burialPlace: memorial.burialPlace ?? "",
            birthDate: memorial.birthDate,
            deathDate: memorial.deathDate,
            lifeStory: memorial.lifeStory ?? "",
            videoUrl: memorial.videoUrl ?? "",
            graveMapUrl: memorial.graveMapUrl ?? "",
            tehilimChapter: memorial.tehilimChapter ?? undefined,
          }}
          initialCoverUrl={memorial.coverPhotoUrl}
          initialGraveImageUrl={memorial.graveImageUrl}
          initialAudioUrl={memorial.lifeStoryAudioUrl}
          initialPhotos={photos}
        />
      </main>
    </div>
  );
}

export default function EditMemorialPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <div className="flex flex-1 items-center justify-center text-muted">טוען...</div>
        </div>
      }
    >
      <EditMemorialPageInner />
    </Suspense>
  );
}
