// Identity comes from reem.bi (login.reembir.com), the central SSO. The
// browser sends the site's reem.bi access token as `Authorization: Bearer`,
// and we verify it by asking the SSO server itself (/api/userinfo) rather
// than trusting anything the browser claims about the user. The same
// server also mints the Firebase custom token the browser signs in with,
// using `user.id` as the Firebase uid — so `uid` here matches
// `request.auth.uid` in firestore.rules and `ownerId` on memorials.

import type { Env } from "./env";

export type Features = Record<string, unknown>;

export type VerifiedUser = {
  uid: string;
  email: string | null;
  features: Features;
};

export class AuthError extends Error {
  constructor(
    public code: "UNAUTHENTICATED" | "INVALID_TOKEN" | "NO_ACCESS" | "AUTH_UNAVAILABLE",
    public status: number
  ) {
    super(code);
  }
}

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer (.+)$/);
  return match ? match[1] : null;
}

type UserInfo = {
  user?: { id?: string; email?: string | null; features?: Features; site?: string; client_id?: string };
  access?: { features?: Features; site?: string; client_id?: string };
  site?: string;
  client_id?: string;
};

export async function verifyReemToken(request: Request, env: Env): Promise<VerifiedUser> {
  const token = getBearerToken(request);
  if (!token) throw new AuthError("UNAUTHENTICATED", 401);

  let res: Response;
  try {
    res = await fetch(`${env.REEM_AUTH_ORIGIN}/api/userinfo`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new AuthError("AUTH_UNAVAILABLE", 503);
  }
  if (res.status === 401) throw new AuthError("INVALID_TOKEN", 401);
  if (res.status === 403) throw new AuthError("NO_ACCESS", 403);
  if (!res.ok) throw new AuthError("AUTH_UNAVAILABLE", 503);

  const data = (await res.json().catch(() => null)) as UserInfo | null;
  const id = data?.user?.id;
  if (!data || !id) throw new AuthError("INVALID_TOKEN", 401);

  // Tokens are issued per site. If the response names the site, make sure
  // it's this one — a token for another reem.bi site must not carry that
  // site's plan/features over here.
  const site =
    data.access?.client_id ?? data.access?.site ?? data.client_id ?? data.site ??
    data.user?.client_id ?? data.user?.site;
  if (site && site !== env.REEM_CLIENT_ID) throw new AuthError("NO_ACCESS", 403);

  const email = typeof data.user?.email === "string" ? data.user.email.trim().toLowerCase() : "";
  return {
    uid: String(id),
    email: email || null,
    features: { ...(data.user?.features ?? {}), ...(data.access?.features ?? {}) },
  };
}

// ---------------------------------------------------------------------------
// Plan limits. Configured per plan (or per user) in the reem.bi dashboard;
// the defaults below apply when a field is missing.
//   max_memorials  number   how many memorial pages the user may own (default 1)
//   memory_wall    boolean  may enable "share a memory" on their pages (default false)
//   unlimited      boolean  no limits at all (replaces the old ADMIN_EMAIL)
// ---------------------------------------------------------------------------

export const DEFAULT_MAX_MEMORIALS = 1;

export function isUnlimited(f: Features): boolean {
  return f.unlimited === true;
}

export function maxMemorials(f: Features): number | null {
  if (isUnlimited(f)) return null;
  const n = Number(f.max_memorials);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : DEFAULT_MAX_MEMORIALS;
}

export function canUseMemoryWall(f: Features): boolean {
  return isUnlimited(f) || f.memory_wall === true;
}
