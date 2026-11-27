"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrentUser, refreshAccount } from "@/lib/use-auth";
import {
  updateMemorial,
  uploadCoverPhoto,
  removeCoverPhoto,
  uploadGraveImage,
  removeGraveImage,
  uploadShareImage,
  removeShareImage,
  uploadLifeStoryAudio,
  addGalleryPhotos,
  deletePhoto,
  replacePhoto,
  type MemorialFormInput,
  type Photo,
} from "@/lib/memorials";
import { SUPPORT_EMAIL } from "@/lib/contact";
import { toGematria } from "@/lib/gematria";
import {
  buildSharePreview,
  defaultShareTitle,
  defaultShareDescription,
  previewImageUrl,
  SHARE_TITLE_MAX,
  SHARE_DESCRIPTION_MAX,
} from "../../worker/src/share-preview";
import {
  createMemorialViaWorker,
  canCreateMemorial,
  WorkerRequestError,
  LEGACY_CREDITS_PER_MEMORIAL,
} from "@/lib/worker-api";

type Props = {
  mode: "create" | "edit";
  slug?: string;
  initial?: MemorialFormInput;
  initialCoverUrl?: string | null;
  initialGraveImageUrl?: string | null;
  initialAudioUrl?: string | null;
  initialShareImageUrl?: string | null;
  initialPhotos?: Photo[];
};

/** Object URL for a picked file, revoked when it changes or unmounts. */
function useObjectUrl(file: File | null): string | null {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);
  return url;
}

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
  shareTitle: "",
  shareDescription: "",
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
  initialShareImageUrl,
  initialPhotos,
}: Props) {
  const { user, account } = useCurrentUser();
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
  const [shareImageFile, setShareImageFile] = useState<File | null>(null);
  const [shareImageRemoved, setShareImageRemoved] = useState(false);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos ?? []);
  const [replacingPhotoId, setReplacingPhotoId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const coverObjectUrl = useObjectUrl(coverFile);
  const shareObjectUrl = useObjectUrl(shareImageFile);

  // Arriving from "עריכת התצוגה בשיתוף" on the memorial page: the form
  // renders after the page has loaded, so the browser can't jump there itself.
  useEffect(() => {
    if (location.hash !== "#share-preview") return;
    const t = setTimeout(() => {
      document.getElementById("share-preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
    return () => clearTimeout(t);
  }, []);

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
        targetSlug = await createMemorialViaWorker(payload);
        void refreshAccount();
      } else if (targetSlug) {
        await updateMemorial(targetSlug, payload);
      }
      if (!targetSlug) throw new Error("NO_SLUG");

      if (coverFile) await uploadCoverPhoto(targetSlug, coverFile);
      if (graveFile) await uploadGraveImage(targetSlug, graveFile);
      if (shareImageFile) await uploadShareImage(targetSlug, shareImageFile);
      if (audioFile) await uploadLifeStoryAudio(targetSlug, audioFile);
      if (galleryFiles.length > 0) {
        await addGalleryPhotos(targetSlug, galleryFiles, photos.length, {
          ownerId: user.uid,
          published: true,
        });
      }

      router.push(`/memorial?slug=${encodeURIComponent(targetSlug)}`);
    } catch (err) {
      if (err instanceof WorkerRequestError && err.code === "LIMIT_REACHED") {
        setError("הגעתם למספר דפי ההנצחה שהחבילה שלכם מאפשרת. לשדרוג, ראו את עמוד החבילה.");
      } else if (err instanceof WorkerRequestError && err.code === "NO_ACCESS") {
        setError(
          `לחשבון הזה אין גישה לאתר. לעזרה: ${SUPPORT_EMAIL}` +
            (err.detail ? ` (קוד: ${err.detail})` : "")
        );
      } else {
        console.error(err);
        setError("משהו השתבש בשמירה. נסו שוב.");
      }
      setSubmitting(false);
    }
  }

  const limitReached = mode === "create" && account !== null && !canCreateMemorial(account);
  // Past the plan's limit, a leftover balance from the old paid credits
  // still pays for a page.
  const usesLegacyCredits =
    account !== null &&
    account.maxMemorials !== null &&
    account.memorialCount >= account.maxMemorials &&
    !limitReached;

  async function handleDeletePhoto(photo: Photo) {
    if (!slug) return;
    await deletePhoto(slug, photo.id);
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
  }

  async function handleReplacePhoto(photo: Photo, file: File) {
    if (!slug) return;
    setReplacingPhotoId(photo.id);
    try {
      const url = await replacePhoto(slug, photo.id, file);
      setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, url } : p)));
    } finally {
      setReplacingPhotoId(null);
    }
  }

  async function handleRemoveCover() {
    if (!slug) return;
    await removeCoverPhoto(slug);
    setCoverFile(null);
    setCoverRemoved(true);
  }

  async function handleRemoveShareImage() {
    setShareImageFile(null);
    if (!slug || !initialShareImageUrl) return;
    await removeShareImage(slug);
    setShareImageRemoved(true);
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
              {fields.tehilimChapter && fields.tehilimChapter >= 1 && fields.tehilimChapter <= 150 && (
                <p className="mt-1.5 text-sm text-muted">
                  יוצג בדף כ: <span className="font-bold text-gold-soft">תהילים פרק {toGematria(fields.tehilimChapter)}</span>, עם הפרק המלא
                </p>
              )}
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
                  src={coverObjectUrl ?? initialCoverUrl!}
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
                  <div className="absolute inset-0 hidden flex-col items-center justify-center gap-1.5 bg-black/60 text-xs text-white group-hover:flex">
                    {replacingPhotoId === p.id ? (
                      <span>מעלה...</span>
                    ) : (
                      <>
                        <label className="cursor-pointer rounded-full bg-white/20 px-2.5 py-1 hover:bg-white/30">
                          החלפה
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              if (file) handleReplacePhoto(p, file);
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(p)}
                          className="rounded-full bg-white/20 px-2.5 py-1 hover:bg-white/30"
                        >
                          הסרה
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <SharePreviewEditor
        fields={fields}
        update={update}
        coverUrl={coverFile ? coverObjectUrl : coverRemoved ? null : initialCoverUrl ?? null}
        shareImageUrl={shareImageFile ? shareObjectUrl : shareImageRemoved ? null : initialShareImageUrl ?? null}
        hasCustomImage={!!shareImageFile || (!!initialShareImageUrl && !shareImageRemoved)}
        onPickImage={(f) => {
          setShareImageFile(f);
          setShareImageRemoved(false);
        }}
        onRemoveImage={handleRemoveShareImage}
      />

      {mode === "create" && (
        <div className="section-card rounded-2xl p-6 text-center">
          {account && (
            <p className="text-sm text-muted">
              {account.maxMemorials === null ? (
                <>החבילה שלכם מאפשרת דפים ללא הגבלה.</>
              ) : (
                <>
                  דפי הנצחה בחבילה שלכם:{" "}
                  <span className="font-bold text-foreground">
                    {account.memorialCount} מתוך {account.maxMemorials}
                  </span>
                  .
                </>
              )}
              {usesLegacyCredits && (
                <>
                  {" "}
                  הדף ייווצר על חשבון יתרת הקרדיטים הקודמת שלכם ({LEGACY_CREDITS_PER_MEMORIAL} מתוך{" "}
                  {account.credits}).
                </>
              )}
            </p>
          )}
          <p className="mt-1 text-xs text-muted">עריכת דף לאחר יצירתו היא תמיד חינמית.</p>
          {limitReached && (
            <div className="mt-3 flex flex-col items-center gap-2">
              <p className="text-sm text-red-400">הגעתם למספר הדפים שהחבילה שלכם מאפשרת.</p>
              <Link
                href="/upgrade"
                className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-[#1a1206] hover:bg-gold-soft transition-colors"
              >
                שדרוג החבילה
              </Link>
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || limitReached}
        className="rounded-full bg-gold px-6 py-3 text-base font-semibold text-[#1a1206] hover:bg-gold-soft transition-colors disabled:opacity-60"
      >
        {submitting ? "שומר..." : mode === "create" ? "יצירת דף ההנצחה" : "שמירת שינויים"}
      </button>
    </form>
  );
}

function SharePreviewEditor({
  fields,
  update,
  coverUrl,
  shareImageUrl,
  hasCustomImage,
  onPickImage,
  onRemoveImage,
}: {
  fields: MemorialFormInput;
  update: <K extends keyof MemorialFormInput>(key: K, value: MemorialFormInput[K]) => void;
  coverUrl: string | null;
  shareImageUrl: string | null;
  hasCustomImage: boolean;
  onPickImage: (file: File) => void;
  onRemoveImage: () => void;
}) {
  const preview = buildSharePreview({ ...fields, coverPhotoUrl: null, shareImageUrl: null });
  const rawImage = shareImageUrl || coverUrl;
  // Uploaded images get the same crop the networks will see; a file just
  // picked (blob: URL) is shown cropped by CSS instead.
  const image = rawImage?.startsWith("blob:") ? rawImage : previewImageUrl(rawImage);

  return (
    <section id="share-preview" className="section-card scroll-mt-24 rounded-2xl p-6">
      <h2 className="mb-1 text-lg font-bold text-gold-soft">תצוגה בשיתוף ברשתות</h2>
      <p className="mb-5 text-sm leading-6 text-muted">
        כך ייראה הקישור לדף כשמשתפים אותו בוואטסאפ, בפייסבוק ובטלגרם. אפשר להשאיר ריק, ואז ייבנה אוטומטית מתוכן הדף.
      </p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Field label="כותרת">
            <input
              className={inputClass}
              maxLength={SHARE_TITLE_MAX}
              placeholder={defaultShareTitle(fields)}
              value={fields.shareTitle ?? ""}
              onChange={(e) => update("shareTitle", e.target.value)}
            />
          </Field>
          <Field label="תיאור קצר">
            <textarea
              className={`${inputClass} min-h-24 resize-y`}
              maxLength={SHARE_DESCRIPTION_MAX}
              placeholder={defaultShareDescription(fields)}
              value={fields.shareDescription ?? ""}
              onChange={(e) => update("shareDescription", e.target.value)}
            />
          </Field>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-muted">תמונה</span>
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer rounded-full border border-border px-4 py-1.5 text-sm font-medium text-gold-soft transition-colors hover:border-gold">
                📷 {hasCustomImage ? "החלפת תמונה" : "בחירת תמונה אחרת"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) onPickImage(f);
                  }}
                />
              </label>
              {hasCustomImage && (
                <button
                  type="button"
                  onClick={onRemoveImage}
                  className="rounded-full border border-border px-4 py-1.5 text-sm text-muted transition-colors hover:border-red-500/50 hover:text-red-500"
                >
                  חזרה לתמונה הראשית
                </button>
              )}
            </div>
            <p className="text-xs text-muted">
              {hasCustomImage
                ? "תוצג התמונה שבחרתם."
                : coverUrl
                  ? "כברירת מחדל מוצגת התמונה הראשית של הדף."
                  : "אין תמונה ראשית, לכן הקישור יוצג בלי תמונה."}
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-muted">תצוגה מקדימה</p>
          <div className="rounded-2xl bg-[#e7ddd0] p-3">
            <div className="mr-auto max-w-[19rem] overflow-hidden rounded-xl rounded-tl-sm bg-[#d9fdd3] p-1 shadow-sm">
              <div className="overflow-hidden rounded-lg bg-[#cfe9c6]">
                {image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt="" className="aspect-[1.91/1] w-full object-cover" />
                )}
                <div className="px-2.5 py-2 text-right">
                  <p className="line-clamp-2 text-sm font-bold leading-5 text-[#111b21]">{preview.title}</p>
                  {preview.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-[#54656f]">{preview.description}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted">
            רשתות שכבר הציגו את הקישור שומרות את התצוגה הישנה לזמן מה, לכן שינוי עשוי להופיע אצלן רק אחרי כמה שעות.
          </p>
        </div>
      </div>
    </section>
  );
}
