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
 * The link to share: zikaron.reembir.com/m/<slug>. On the site's own
 * domain that path is answered by the Cloudflare Worker (a route in
 * worker/wrangler.toml), which gives WhatsApp/Facebook/etc. this
 * memorial's own title, text and photo — the static site can't — and then
 * forwards people to the page. Without a configured site URL (local dev)
 * it falls back to the Worker's own address, then to the plain page URL.
 */
export function memorialShareUrl(slug: string): string {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const worker = (process.env.NEXT_PUBLIC_WORKER_URL || "").replace(/\/$/, "");
  const base = site && !BASE_PATH ? site : worker;
  return base ? `${base}/m/${encodeURIComponent(slug)}` : memorialAbsoluteUrl(slug);
}

export function cleanSlug(raw: string | null | undefined): string {
  const m = (raw ?? "").trim().match(/^[A-Za-z0-9-]+/);
  return m ? m[0].replace(/-+$/, "") : "";
}
