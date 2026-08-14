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
