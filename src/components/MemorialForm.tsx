"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/use-auth";
import {
  updateMemorial,
  uploadCoverPhoto,
  removeCoverPhoto,
  uploadGraveImage,
  removeGraveImage,
  uploadLifeStoryAudio,
  addGalleryPhotos,
  deletePhoto,
  type MemorialFormInput,
  type Photo,
} from "@/lib/memorials";
import {
  createMemorialViaWorker,
  subscribeToCredits,
  InsufficientCreditsError,
  CREDITS_PER_MEMORIAL,
  ADMIN_EMAIL,
} from "@/lib/credits";

type Props = {
  mode: "create" | "edit";
  slug?: string;
  initial?: MemorialFormInput;
  initialCoverUrl?: string | null;
  initialGraveImageUrl?: string | null;
  initialAudioUrl?: string | null;
  initialPhotos?: Photo[];
};

const empty: MemorialFormInput = {
  firstName: "",
  lastName: "",
  fatherName: "",
  motherName: "",
  spouseName: "",
  childrenNames: "",
  occupation: "",
  burialPlace: "",
  birthDate: "",
  deathDate: "",
  lifeStory: "",
  videoUrl: "",
  graveMapUrl: "",
  tehilimChapter: undefined,
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground placeholder:text-muted/60 focus:border-gold focus:outline-none";

export function MemorialForm({
  mode,
  slug,
  initial,
  initialCoverUrl,
  initialGraveImageUrl,
  initialAudioUrl,
  initialPhotos,
}: Props) {
  const { user } = useCurrentUser();
  const router = useRouter();
  const [fields, setFields] = useState<MemorialFormInput>(initial ?? empty);
  const [includeTehilim, setIncludeTehilim] = useState(
    typeof initial?.tehilimChapter === "number"
  );
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [graveFile, setGraveFile] = useState<File | null>(null);
  const [graveRemoved, setGraveRemoved] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (mode !== "create" || !user) return;
    const unsub = subscribeToCredits(user.uid, setCredits);
    return () => unsub();
  }, [mode, user]);

  function update<K extends keyof MemorialFormInput>(key: K, value: MemorialFormInput[K]) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      setError("יש להתחבר כדי לשמור");
      return;
    }
    if (!fields.firstName.trim() || !fields.lastName.trim()) {
      setError("יש להזין שם פרטי ושם משפחה");
      return;
    }
    if (!fields.birthDate || !fields.deathDate) {
      setError("יש להזין תאריך לידה ותאריך פטירה");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const payload: MemorialFormInput = {
        ...fields,
        tehilimChapter: includeTehilim ? fields.tehilimChapter || 100 : undefined,
      };
      let targetSlug = slug;
      if (mode === "create") {
        const idToken = await user.getIdToken();
        targetSlug = await createMemorialViaWorker(idToken, payload);
      } else if (targetSlug) {
        await updateMemorial(targetSlug, payload);
      }
      if (!targetSlug) throw new Error("NO_SLUG");

      if (coverFile) await uploadCoverPhoto(targetSlug, coverFile);
      if (graveFile) await uploadGraveImage(targetSlug, graveFile);
      if (audioFile) await uploadLifeStoryAudio(targetSlug, audioFile);
      if (galleryFiles.length > 0) {
        await addGalleryPhotos(targetSlug, galleryFiles, photos.length, {
          ownerId: user.uid,
          published: true,
        });
      }

      router.push(`/memorial?slug=${encodeURIComponent(targetSlug)}`);
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        setError(
          `אין מספיק קרדיטים ליצירת דף (יש לכם ${err.credits}, נדרשים ${CREDITS_PER_MEMORIAL}). ` +
            `אפשר לרכוש קרדיטים בעמוד הקרדיטים.`
        );
      } else {
        console.error(err);
        setError("משהו השתבש בשמירה. נסו שוב.");
      }
      setSubmitting(false);
    }
  }

  const notEnoughCredits =
    mode === "create" && !isAdmin && credits !== null && credits < CREDITS_PER_MEMORIAL;

  async function handleDeletePhoto(photo: Photo) {
    if (!slug) return;
    await deletePhoto(slug, photo.id);
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
  }

  async function handleRemoveCover() {
    if (!slug) return;
    await removeCoverPhoto(slug);
    setCoverFile(null);
    setCoverRemoved(true);
  }

  async function handleRemoveGrave() {
    if (!slug) return;
    await removeGraveImage(slug);
    setGraveFile(null);
    setGraveRemoved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <section className="section-card rounded-2xl p-6">
        <h2 className="mb-4 text-lg font-bold text-gold-soft">פרטי היקיר/ה</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="שם פרטי *">
            <input
              required
              className={inputClass}
              value={fields.firstName}
              onChange={(e) => update("firstName", e.target.value)}
            />
          </Field>
          <Field label="שם משפחה *">
            <input
              required
              className={inputClass}
              value={fields.lastName}
              onChange={(e) => update("lastName", e.target.value)}
            />
          </Field>
          <Field label="שם האב">
            <input
              className={inputClass}
              value={fields.fatherName}
              onChange={(e) => update("fatherName", e.target.value)}
            />
          </Field>
          <Field label="שם האם">
            <input
              className={inputClass}
              value={fields.motherName}
              onChange={(e) => update("motherName", e.target.value)}
            />
          </Field>
          <Field label="בן/בת זוג">
            <input
              className={inputClass}
              value={fields.spouseName}
              onChange={(e) => update("spouseName", e.target.value)}
            />
          </Field>
          <Field label="ילדים (מופרדים בפסיק)">
            <input
              className={inputClass}
              placeholder="דנה, יוסי, מיכל"
              value={fields.childrenNames}
              onChange={(e) => update("childrenNames", e.target.value)}
            />
          </Field>
          <Field label="עיסוק">
            <input
              className={inputClass}
              value={fields.occupation}
              onChange={(e) => update("occupation", e.target.value)}
            />
          </Field>
          <Field label="מקום קבורה">
            <input
              className={inputClass}
              value={fields.burialPlace}
              onChange={(e) => update("burialPlace", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="section-card rounded-2xl p-6">
        <h2 className="mb-4 text-lg font-bold text-gold-soft">תאריכים</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="תאריך לידה (לועזי) *">
            <input
              required
              type="date"
              className={inputClass}
              value={fields.birthDate}
              onChange={(e) => update("birthDate", e.target.value)}
            />
          </Field>
          <Field label="תאריך פטירה (לועזי) *">
            <input
              required
              type="date"
              className={inputClass}
              value={fields.deathDate}
              onChange={(e) => update("deathDate", e.target.value)}
            />
          </Field>
        </div>
        <p className="mt-3 text-xs text-muted">
          התאריך העברי, הגיל וימי השנה הבאים יחושבו אוטומטית בדף ההנצחה.
        </p>
      </section>

      <section className="section-card rounded-2xl p-6">
        <h2 className="mb-4 text-lg font-bold text-gold-soft">סיפור חיים</h2>
        <Field label="ספרו על היקיר/ה">
          <textarea
            className={`${inputClass} min-h-40 resize-y`}
            value={fields.lifeStory}
            onChange={(e) => update("lifeStory", e.target.value)}
          />
        </Field>
        <div className="mt-4">
          <Field label="הקלטת קול לסיפור החיים (אופציונלי)">
            <input
              type="file"
              accept="audio/*"
              className="text-sm text-muted"
              onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
            />
          </Field>
          {initialAudioUrl && !audioFile && (
            <p className="mt-1 text-xs text-muted">קובץ קול קיים יישמר אם לא תעלו קובץ חדש.</p>
          )}
        </div>
        <div className="mt-4">
          <Field label="קישור לסרטון (YouTube)">
            <input
              className={inputClass}
              placeholder="https://youtube.com/..."
              value={fields.videoUrl}
              onChange={(e) => update("videoUrl", e.target.value)}
            />
          </Field>
        </div>
        <div className="mt-4">
          <label className="flex items-center gap-2.5 text-sm font-medium text-muted">
            <input
              type="checkbox"
              checked={includeTehilim}
              onChange={(e) => {
                setIncludeTehilim(e.target.checked);
                if (e.target.checked && !fields.tehilimChapter) {
                  update("tehilimChapter", 100);
                }
              }}
              className="size-4 accent-gold"
            />
            הוספת פרק תהילים מוקדש לדף (אופציונלי)
          </label>
          {includeTehilim && (
            <div className="mt-3">
              <Field label="מספר הפרק (1–150)">
                <input
                  type="number"
                  min={1}
                  max={150}
                  className={`${inputClass} w-28`}
                  value={fields.tehilimChapter ?? 100}
                  onChange={(e) => update("tehilimChapter", Number(e.target.value))}
                />
              </Field>
            </div>
          )}
        </div>
      </section>

      <section className="section-card rounded-2xl p-6">
        <h2 className="mb-4 text-lg font-bold text-gold-soft">תמונות</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="תמונה ראשית">
            <input
              type="file"
              accept="image/*"
              className="text-sm text-muted"
              onChange={(e) => {
                setCoverFile(e.target.files?.[0] ?? null);
                setCoverRemoved(false);
              }}
            />
            {(coverFile || (initialCoverUrl && !coverRemoved)) && (
              <div className="mt-2 flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverFile ? URL.createObjectURL(coverFile) : initialCoverUrl!}
                  alt=""
                  className="h-28 w-28 rounded-lg object-cover"
                />
                {mode === "edit" && !coverFile && (
                  <button
                    type="button"
                    onClick={handleRemoveCover}
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-red-500/50 hover:text-red-500"
                  >
                    הסרה
                  </button>
                )}
              </div>
            )}
          </Field>
          <Field label="תמונת המצבה (אופציונלי)">
            <input
              type="file"
              accept="image/*"
              className="text-sm text-muted"
              onChange={(e) => {
                setGraveFile(e.target.files?.[0] ?? null);
                setGraveRemoved(false);
              }}
            />
            {(graveFile || (initialGraveImageUrl && !graveRemoved)) && (
              <div className="mt-2 flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={graveFile ? URL.createObjectURL(graveFile) : initialGraveImageUrl!}
                  alt=""
                  className="h-28 w-28 rounded-lg object-cover"
                />
                {mode === "edit" && !graveFile && (
                  <button
                    type="button"
                    onClick={handleRemoveGrave}
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-red-500/50 hover:text-red-500"
                  >
                    הסרה
                  </button>
                )}
              </div>
            )}
          </Field>
        </div>

        <div className="mt-4">
          <Field label="קישור ניווט למצבה (Waze / Google Maps)">
            <input
              className={inputClass}
              placeholder="https://waze.com/ul?..."
              value={fields.graveMapUrl}
              onChange={(e) => update("graveMapUrl", e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-6">
          <Field label="גלריית תמונות">
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              className="text-sm text-muted"
              onChange={(e) => setGalleryFiles(Array.from(e.target.files ?? []))}
            />
          </Field>

          {photos.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((p) => (
                <div key={p.id} className="group relative overflow-hidden rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="h-24 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(p)}
                    className="absolute inset-0 hidden items-center justify-center bg-black/60 text-sm text-white group-hover:flex"
                  >
                    הסרה
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {mode === "create" && (
        <div className="section-card rounded-2xl p-6 text-center">
          {isAdmin ? (
            <p className="text-sm text-gold-soft">חשבון מנהל — יצירת דפים ללא הגבלה וללא עלות.</p>
          ) : (
            <>
              <p className="text-sm text-muted">
                יצירת דף עולה <span className="font-bold text-gold-soft">{CREDITS_PER_MEMORIAL} קרדיטים</span>.
                {credits !== null && (
                  <> יתרתכם הנוכחית: <span className="font-bold text-foreground">{credits}</span>.</>
                )}
              </p>
              <p className="mt-1 text-xs text-muted">עריכת דף לאחר יצירתו היא תמיד חינמית.</p>
              {notEnoughCredits && (
                <div className="mt-3 flex flex-col items-center gap-2">
                  <p className="text-sm text-red-400">אין לכם מספיק קרדיטים ליצירת דף.</p>
                  <Link
                    href="/credits"
                    className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-[#1a1206] hover:bg-gold-soft transition-colors"
                  >
                    רכישת קרדיטים
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || notEnoughCredits}
        className="rounded-full bg-gold px-6 py-3 text-base font-semibold text-[#1a1206] hover:bg-gold-soft transition-colors disabled:opacity-60"
      >
        {submitting ? "שומר..." : mode === "create" ? "יצירת דף ההנצחה" : "שמירת שינויים"}
      </button>
    </form>
  );
}
