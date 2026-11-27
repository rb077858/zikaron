// GET /m/<slug> — the link people share. Social-network crawlers don't run
// JavaScript, and the site is a static export where every memorial lives
// at the same /memorial?slug=… HTML file, so this is the one place that can
// give each memorial its own preview. Crawlers read the tags below;
// people are sent straight on to the memorial page by a script (no
// meta-refresh, which some crawlers follow — they'd then pick up the
// site's generic tags instead of these).

import type { Env } from "./env";
import type { FirestoreClient } from "./firestore";
import { buildSharePreview, type SharePreviewSource } from "./share-preview";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function memorialPageUrl(env: Env, slug: string): string {
  const site = (env.PUBLIC_SITE_URL || env.ALLOWED_ORIGIN).replace(/\/$/, "");
  return slug ? `${site}/memorial?slug=${encodeURIComponent(slug)}` : `${site}/`;
}

export async function handleSharePage(
  request: Request,
  env: Env,
  slug: string,
  getDb: () => Promise<FirestoreClient>
): Promise<Response> {
  const target = memorialPageUrl(env, slug);
  const shareUrl = new URL(request.url);
  shareUrl.search = "";
  shareUrl.hash = "";

  let source: SharePreviewSource | null = null;
  if (/^[a-z0-9-]{1,120}$/.test(slug)) {
    try {
      const db = await getDb();
      const doc = await db.get(`memorials/${slug}`);
      if (doc.exists && doc.fields.published === true) source = doc.fields as SharePreviewSource;
    } catch (err) {
      console.error("share page lookup failed", err);
    }
  }

  const preview = source
    ? buildSharePreview(source)
    : { title: "דף הנצחה", description: "", imageUrl: null };

  const tags = [
    `<meta property="og:type" content="website">`,
    `<meta property="og:locale" content="he_IL">`,
    `<meta property="og:url" content="${esc(shareUrl.toString())}">`,
    `<meta property="og:title" content="${esc(preview.title)}">`,
    preview.description && `<meta property="og:description" content="${esc(preview.description)}">`,
    preview.description && `<meta name="description" content="${esc(preview.description)}">`,
    preview.imageUrl && `<meta property="og:image" content="${esc(preview.imageUrl)}">`,
    preview.imageUrl && `<meta property="og:image:secure_url" content="${esc(preview.imageUrl)}">`,
    preview.imageUrl?.includes("w_1200,h_630") && `<meta property="og:image:width" content="1200">`,
    preview.imageUrl?.includes("w_1200,h_630") && `<meta property="og:image:height" content="630">`,
    preview.imageUrl && `<meta property="og:image:alt" content="${esc(preview.title)}">`,
    `<meta name="twitter:card" content="${preview.imageUrl ? "summary_large_image" : "summary"}">`,
    `<meta name="twitter:title" content="${esc(preview.title)}">`,
    preview.description && `<meta name="twitter:description" content="${esc(preview.description)}">`,
    preview.imageUrl && `<meta name="twitter:image" content="${esc(preview.imageUrl)}">`,
  ]
    .filter(Boolean)
    .join("\n    ");

  const html = `<!doctype html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${esc(preview.title)}</title>
    ${tags}
    <style>
      body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
        background:#f2ead9;color:#7d705a;font-family:Heebo,Arial,sans-serif;text-align:center}
      a{color:#9c6f18}
    </style>
    <script>location.replace(${JSON.stringify(target).replace(/</g, "\\u003c")});</script>
  </head>
  <body>
    <p>🕯️<br>מעבירים אתכם לדף ההנצחה…<br><a href="${esc(target)}">לחצו כאן אם הדף לא נפתח</a></p>
  </body>
</html>`;

  return new Response(request.method === "HEAD" ? null : html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Short, so edits to the preview show up quickly (the networks keep
      // their own cache on top of this).
      "Cache-Control": "public, max-age=300",
      "X-Robots-Tag": "noindex",
    },
  });
}
