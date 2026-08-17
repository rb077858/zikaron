"use client";

import { useState } from "react";
import { addMemory, deleteMemory, type Memory, type Memorial } from "@/lib/memorials";

const MAX_PHOTOS = 4;

export function MemoryWallSection({
  memorial,
  fullName,
  memories,
  isOwner,
}: {
  memorial: Memorial;
  fullName: string;
  memories: Memory[];
  isOwner: boolean;
}) {
  const slug = memorial.slug;
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justShared, setJustShared] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function handleDeleteMemory(memoryId: string) {
    await deleteMemory(slug, memoryId);
    setConfirmDeleteId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("יש להזין שם");
      return;
    }
    if (!text.trim() && photoFiles.length === 0) {
      setError("יש לכתוב זיכרון או לצרף תמונה");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await addMemory(slug, name, text, photoFiles, {
        ownerId: memorial.ownerId,
        published: memorial.published,
      });
      setName("");
      setText("");
      setPhotoFiles([]);
      setJustShared(true);
      setTimeout(() => setJustShared(false), 3000);
    } catch {
      setError("לא הצלחנו לשתף את הזיכרון, נסו שוב");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="memories" className="scroll-mt-nav px-5 py-14">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="gold-divider flex-1" />
          <span className="text-2xl">💭</span>
          <div className="gold-divider flex-1" />
        </div>
        <h2 className="mb-2 text-center text-2xl font-bold text-gold-soft">שיתוף זיכרון</h2>
        <p className="mb-8 text-center text-sm leading-6 text-muted">
          מי שזוכר/ת את {fullName} מוזמן/ת לשתף כאן זיכרון, סיפור קטן או תמונה.
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-3 text-right">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="השם שלכם"
            className="w-full rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-center placeholder:text-muted/60 focus:border-gold focus:outline-none"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`זיכרון או סיפור קטן על ${fullName}...`}
            className="min-h-24 w-full resize-y rounded-lg border border-border bg-surface-2 px-4 py-2.5 placeholder:text-muted/60 focus:border-gold focus:outline-none"
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-muted">צירוף תמונות (עד {MAX_PHOTOS}, אופציונלי)</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setPhotoFiles(Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS))}
              className="text-sm text-muted"
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-gold px-6 py-3 text-base font-semibold text-[#1a1206] hover:bg-gold-soft transition-colors disabled:opacity-60"
          >
            {submitting ? "משתף/ת..." : justShared ? "הזיכרון שותף, תודה 💛" : "שיתוף הזיכרון"}
          </button>
        </form>
      </div>

      {memories.length > 0 && (
        <div className="mx-auto mt-14 max-w-4xl">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {memories.map((m, i) => (
              <div
                key={m.id}
                className="memory-card section-card relative overflow-hidden rounded-2xl transition-all hover:border-gold/50 hover:shadow-[0_8px_24px_rgba(54,44,31,0.12)]"
                style={{ animationDelay: `${Math.min(i, 10) * 70}ms` }}
              >
                {isOwner && (
                  <div className="absolute left-2 top-2 z-10">
                    {confirmDeleteId === m.id ? (
                      <div className="flex items-center gap-1 rounded-full bg-surface/95 p-1 shadow-sm">
                        <button
                          type="button"
                          onClick={() => handleDeleteMemory(m.id)}
                          className="rounded-full border border-red-500/50 px-2.5 py-1 text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/10"
                        >
                          מחיקה
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-full border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-gold hover:text-gold-soft"
                        >
                          ביטול
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(m.id)}
                        aria-label="מחיקת הזיכרון"
                        className="flex size-8 items-center justify-center rounded-full bg-surface/90 text-muted shadow-sm transition-colors hover:text-red-500"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}
                {m.photoUrls.length > 0 && (
                  <div
                    className={`grid gap-0.5 ${
                      m.photoUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"
                    }`}
                  >
                    {m.photoUrls.map((url, pi) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={pi}
                        src={url}
                        alt=""
                        onClick={() => setLightbox(url)}
                        className={`w-full cursor-pointer object-cover transition-transform hover:scale-[1.03] ${
                          m.photoUrls.length === 1 ? "max-h-72" : "aspect-square"
                        }`}
                      />
                    ))}
                  </div>
                )}
                <div className="p-5 text-right">
                  {m.text && <p className="mb-3 leading-7 text-foreground/90">{m.text}</p>}
                  <div className="gold-divider mb-3" />
                  <p className="font-bold text-gold-soft">{m.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
