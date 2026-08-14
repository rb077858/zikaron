"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCurrentUser } from "@/lib/use-auth";
import {
  subscribeToMemorial,
  subscribeToPhotos,
  subscribeToCandles,
  type Memorial,
  type Photo,
  type Candle,
} from "@/lib/memorials";
import { HeroHeader } from "@/components/memorial/HeroHeader";
import { PublicNav } from "@/components/memorial/PublicNav";
import { CandleSection } from "@/components/memorial/CandleSection";
import { IdCardSection } from "@/components/memorial/IdCardSection";
import { LifeStorySection } from "@/components/memorial/LifeStorySection";
import { TehilimSection } from "@/components/memorial/TehilimSection";
import { MediaSection } from "@/components/memorial/MediaSection";
import { YahrzeitSection } from "@/components/memorial/YahrzeitSection";
import { GraveSection } from "@/components/memorial/GraveSection";
import { ShareRow } from "@/components/memorial/ShareRow";
import { QrCodeCard } from "@/components/memorial/QrCodeCard";
import { youtubeEmbedUrl } from "@/lib/youtube";

function MemorialPageInner() {
  const slug = useSearchParams().get("slug") ?? "";
  const { user } = useCurrentUser();
  const [memorial, setMemorial] = useState<Memorial | null | undefined>(undefined);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [candles, setCandles] = useState<Candle[]>([]);

  useEffect(() => {
    if (!slug) return;
    const unsub = subscribeToMemorial(slug, setMemorial);
    return () => unsub();
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const unsub = subscribeToPhotos(slug, setPhotos);
    return () => unsub();
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const unsub = subscribeToCandles(slug, setCandles);
    return () => unsub();
  }, [slug]);

  if (!slug || memorial === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">טוען...</div>
    );
  }

  if (memorial === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-5 text-center">
        <span className="text-4xl">🕯️</span>
        <p className="text-lg text-muted">הדף לא נמצא</p>
        <Link href="/" className="text-gold-soft hover:underline">
          חזרה לעמוד הבית
        </Link>
      </div>
    );
  }

  const fullName = `${memorial.firstName} ${memorial.lastName}`;
  const isOwner = user?.uid === memorial.ownerId;
  const hasTehilim = !!memorial.tehilimChapter;
  const hasMedia = photos.length > 0 || !!(memorial.videoUrl && youtubeEmbedUrl(memorial.videoUrl));

  return (
    <div className="flex min-h-screen flex-col">
      <HeroHeader memorial={memorial} />
      <PublicNav hasTehilim={hasTehilim} hasMedia={hasMedia} />

      <main className="flex-1">
        <IdCardSection memorial={memorial} />
        <LifeStorySection memorial={memorial} />
        <TehilimSection chapter={memorial.tehilimChapter} />
        <MediaSection memorial={memorial} photos={photos} />
        <YahrzeitSection memorial={memorial} />
        <GraveSection memorial={memorial} />
        <CandleSection memorial={memorial} fullName={fullName} candles={candles} />
        <ShareRow slug={slug} fullName={fullName} />

        {isOwner && (
          <section className="border-t border-border px-5 py-14">
            <div className="mx-auto flex max-w-lg flex-col items-center gap-6 text-center">
              <p className="text-sm text-muted">כלים לבעל/ת הדף</p>
              <QrCodeCard slug={slug} fullName={fullName} />
              <Link
                href={`/memorial/edit?slug=${encodeURIComponent(slug)}`}
                className="rounded-full border border-border px-6 py-2.5 text-sm font-semibold hover:border-gold hover:text-gold-soft transition-colors"
              >
                ✏️ עריכת דף ההנצחה
              </Link>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-border px-5 py-8 text-center text-sm text-muted">
        <p>
          דף הנצחה שנוצר באהבה ובכבוד ·{" "}
          <Link href="/" className="text-gold-soft hover:underline">
            זיכרון
          </Link>
        </p>
      </footer>
    </div>
  );
}

export default function MemorialPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-muted">טוען...</div>
      }
    >
      <MemorialPageInner />
    </Suspense>
  );
}
