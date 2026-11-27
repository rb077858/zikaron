// How a memorial page looks when its link is shared (WhatsApp, Facebook,
// Telegram, X...). Used by both the Worker — which serves the preview tags
// at /m/<slug> — and the site's edit form, which shows a live preview, so
// the two always agree. Keep this file dependency-free.

export type SharePreviewSource = {
  firstName?: string | null;
  lastName?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  lifeStory?: string | null;
  coverPhotoUrl?: string | null;
  shareTitle?: string | null;
  shareDescription?: string | null;
  shareImageUrl?: string | null;
};

export type SharePreview = {
  title: string;
  description: string;
  /** null = text-only preview */
  imageUrl: string | null;
};

export const SHARE_TITLE_MAX = 90;
export const SHARE_DESCRIPTION_MAX = 200;

function clean(s: string | null | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

function years(m: SharePreviewSource): string {
  const b = clean(m.birthDate).slice(0, 4);
  const d = clean(m.deathDate).slice(0, 4);
  return b && d ? `${b}–${d}` : d || b;
}

/** Cuts at a word boundary and adds an ellipsis. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:–-]+$/, "")}…`;
}

export function defaultShareTitle(m: SharePreviewSource): string {
  const name = clean(`${m.firstName ?? ""} ${m.lastName ?? ""}`) || "דף הנצחה";
  const y = years(m);
  return y ? `${name} · ${y}` : name;
}

export function defaultShareDescription(m: SharePreviewSource): string {
  const story = clean(m.lifeStory);
  if (story) return truncate(story, 160);
  const name = clean(`${m.firstName ?? ""} ${m.lastName ?? ""}`);
  return name ? `דף הנצחה לזכר ${name}. מוזמנים להיכנס, להיזכר ולהדליק נר.` : "דף הנצחה";
}

/**
 * Social networks want a ~1.91:1 image around 1200×630, under a few
 * hundred KB. Cloudinary images get resized and cropped around the
 * subject (faces first) on the fly; other URLs are used as they are.
 */
export function previewImageUrl(url: string | null | undefined): string | null {
  const u = clean(url);
  if (!u) return null;
  const m = u.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/);
  if (!m) return u;
  return `${m[1]}c_fill,g_auto,w_1200,h_630,q_auto,f_jpg/${m[2]}`;
}

export function buildSharePreview(m: SharePreviewSource): SharePreview {
  return {
    title: truncate(clean(m.shareTitle) || defaultShareTitle(m), SHARE_TITLE_MAX),
    description: truncate(clean(m.shareDescription) || defaultShareDescription(m), SHARE_DESCRIPTION_MAX),
    imageUrl: previewImageUrl(m.shareImageUrl || m.coverPhotoUrl),
  };
}
