"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/use-auth";
import {
  createMemorial,
  updateMemorial,
  uploadCoverPhoto,
  uploadGraveImage,
  uploadLifeStoryAudio,
  addGalleryPhotos,
  deletePhoto,
  type MemorialFormInput,
  type Photo,
} from "@/lib/memorials";

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
  tehilimChapter: 100,
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
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [graveFile, setGraveFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

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
      let targetSlug = slug;
      if (mode === "create") {
        targetSlug = await createMemorial(user.uid, user.email, fields);
      } else if (targetSlug) {
        await updateMemorial(targetSlug, fields);
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

      router.push(`/memorial/${targetSlug}`);
    } catch (err) {
      console.error(err);
      setError("משהו השתבש בשמירה. נסו שוב.");
      setSubmitting(false);
    }
  }

  async function handleDeletePhoto(photo: Photo) {
    if (!slug) return;
    await deletePhoto(slug, photo.id);
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
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
          <Field label="פרק תהילים מוקדש (1–150)">
            <input
              type="number"
              min={1}
              max={150}
              className={`${inputClass} w-28`}
              value={fields.tehilimChapter}
              onChange={(e) => update("tehilimChapter", Number(e.target.value))}
            />
          </Field>
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
              onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
            />
            {(coverFile || initialCoverUrl) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverFile ? URL.createObjectURL(coverFile) : initialCoverUrl!}
                alt=""
                className="mt-2 h-28 w-28 rounded-lg object-cover"
              />
            )}
          </Field>
          <Field label="תמונת המצבה (אופציונלי)">
            <input
              type="file"
              accept="image/*"
              className="text-sm text-muted"
              onChange={(e) => setGraveFile(e.target.files?.[0] ?? null)}
            />
            {(graveFile || initialGraveImageUrl) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={graveFile ? URL.createObjectURL(graveFile) : initialGraveImageUrl!}
                alt=""
                className="mt-2 h-28 w-28 rounded-lg object-cover"
              />
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

      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-gold px-6 py-3 text-base font-semibold text-[#1a1206] hover:bg-gold-soft transition-colors disabled:opacity-60"
      >
        {submitting ? "שומר..." : mode === "create" ? "יצירת דף ההנצחה" : "שמירת שינויים"}
      </button>
    </form>
  );
}
