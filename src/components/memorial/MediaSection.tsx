"use client";

import { useState } from "react";
import type { Photo, Memorial } from "@/lib/memorials";
import { youtubeEmbedUrl } from "@/lib/youtube";

export function MediaSection({
  memorial,
  photos,
}: {
  memorial: Memorial;
  photos: Photo[];
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const embedUrl = memorial.videoUrl ? youtubeEmbedUrl(memorial.videoUrl) : null;

  if (photos.length === 0 && !embedUrl) return null;

  return (
    <section id="media" className="scroll-mt-nav px-5 py-14">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="gold-divider flex-1" />
          <span className="text-2xl">🖼️</span>
          <div className="gold-divider flex-1" />
        </div>
        <h2 className="mb-8 text-center text-2xl font-bold text-gold-soft">תמונות ומדיה</h2>

        {embedUrl && (
          <div className="mx-auto mb-10 aspect-video max-w-2xl overflow-hidden rounded-2xl border border-border">
            <iframe
              src={embedUrl}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {photos.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.id}
                src={p.url}
                alt={p.caption || ""}
                onClick={() => setLightbox(p.url)}
                className="aspect-square w-full cursor-pointer rounded-xl object-cover transition-transform hover:scale-[1.02]"
              />
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/90 p-6"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </section>
  );
}
