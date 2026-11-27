export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Prefixes a root-relative path (e.g. "/uploads/x.jpg") with the app's basePath. */
export function withBasePath(p: string): string {
  if (!p) return p;
  if (/^https?:\/\//.test(p)) return p;
  return `${BASE_PATH}${p.startsWith("/") ? p : `/${p}`}`;
}

/** Absolute, shareable URL for a memorial page, including protocol + host + basePath. */
export function memorialAbsoluteUrl(slug: string): string {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000" + BASE_PATH;
  return `${site.replace(/\/$/, "")}/memorial?slug=${encodeURIComponent(slug)}`;
}

/**
 * The link to share: goes through the Worker's /m/<slug>, which gives
 * WhatsApp/Facebook/etc. this memorial's own title, text and photo (the
 * static site can't), then forwards people to the page. Falls back to the
 * plain page URL when no Worker is configured.
 */
export function memorialShareUrl(slug: string): string {
  const worker = (process.env.NEXT_PUBLIC_WORKER_URL || "").replace(/\/$/, "");
  return worker ? `${worker}/m/${encodeURIComponent(slug)}` : memorialAbsoluteUrl(slug);
}

/**
 * The memorial id from a ?slug= value, ignoring anything glued onto it —
 * e.g. "/memorial?slug=israel-israeli?version=2" (a second "?"), a
 * trailing slash or punctuation picked up when a link is copied from a
 * message. Slugs are ASCII letters, digits and hyphens.
 */
export function cleanSlug(raw: string | null | undefined): string {
  const m = (raw ?? "").trim().match(/^[A-Za-z0-9-]+/);
  return m ? m[0].replace(/-+$/, "") : "";
}
