import type { Env } from "./env";
import { verifyFirebaseIdToken, getBearerToken, type VerifiedUser } from "./firebase-auth";
import { getGoogleAccessToken } from "./google-token";
import {
  FirestoreClient,
  fsString,
  fsInt,
  fsBool,
  fsNull,
  fsTimestamp,
  isFailedPrecondition,
  type FirestoreWrite,
  type FSValue,
} from "./firestore";
import { capturePayPalOrder } from "./paypal";
import { slugify } from "./slug";
import { lookupUserByEmail, setUserDisabled } from "./identity-toolkit";

const CREDITS_PER_MEMORIAL = 5;
const MEMORY_WALL_COST = 2;
const MAX_ATTEMPTS = 3;

function corsHeaders(env: Env): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function json(env: Env, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(env) },
  });
}

async function getFirestoreClient(env: Env): Promise<FirestoreClient> {
  const accessToken = await getGoogleAccessToken(
    env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    "https://www.googleapis.com/auth/datastore"
  );
  return new FirestoreClient(env.FIREBASE_PROJECT_ID, accessToken);
}

// Identity Toolkit (user lookup/block) needs its own OAuth token — a
// separate scope from the Firestore one above, and a separate IAM grant
// ("Firebase Authentication Admin") on the service account. See README.
async function getIdentityToolkitToken(env: Env): Promise<string> {
  return getGoogleAccessToken(
    env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    "https://www.googleapis.com/auth/identitytoolkit"
  );
}

type AdminAuthResult = { ok: true; user: VerifiedUser } | { ok: false; response: Response };

async function requireAdmin(request: Request, env: Env): Promise<AdminAuthResult> {
  const token = getBearerToken(request);
  if (!token) return { ok: false, response: json(env, { error: "UNAUTHENTICATED" }, 401) };

  let user: VerifiedUser;
  try {
    user = await verifyFirebaseIdToken(token, env.FIREBASE_PROJECT_ID);
  } catch {
    return { ok: false, response: json(env, { error: "INVALID_TOKEN" }, 401) };
  }

  if (user.email !== env.ADMIN_EMAIL) {
    return { ok: false, response: json(env, { error: "FORBIDDEN" }, 403) };
  }
  return { ok: true, user };
}

type MemorialFormInput = {
  firstName: string;
  lastName: string;
  fatherName?: string;
  motherName?: string;
  spouseName?: string;
  childrenNames?: string;
  occupation?: string;
  burialPlace?: string;
  birthDate: string;
  deathDate: string;
  lifeStory?: string;
  videoUrl?: string;
  graveMapUrl?: string;
  tehilimChapter?: number;
};

function optString(v: unknown): FSValue {
  return typeof v === "string" && v.trim() ? fsString(v.trim()) : fsNull();
}

function optChapter(v: unknown): FSValue {
  return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 150
    ? fsInt(v)
    : fsNull();
}

async function handleCreateMemorial(request: Request, env: Env): Promise<Response> {
  const token = getBearerToken(request);
  if (!token) return json(env, { error: "UNAUTHENTICATED" }, 401);

  let user;
  try {
    user = await verifyFirebaseIdToken(token, env.FIREBASE_PROJECT_ID);
  } catch {
    return json(env, { error: "INVALID_TOKEN" }, 401);
  }

  const body = (await request.json().catch(() => null)) as MemorialFormInput | null;
  if (!body || !body.firstName?.trim() || !body.lastName?.trim() || !body.birthDate || !body.deathDate) {
    return json(env, { error: "INVALID_INPUT" }, 400);
  }

  const isAdmin = user.email === env.ADMIN_EMAIL;
  const db = await getFirestoreClient(env);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // 1. Check the caller's credit balance (skipped entirely for the admin
    //    account, which can create unlimited pages for free).
    let currentCredits = 0;
    let creditsUpdateTime: string | undefined;
    if (!isAdmin) {
      const userDoc = await db.get(`users/${user.uid}`);
      if (userDoc.exists) {
        currentCredits = Number(userDoc.fields.credits ?? 0);
        creditsUpdateTime = userDoc.updateTime;
      }
      if (currentCredits < CREDITS_PER_MEMORIAL) {
        return json(env, { error: "INSUFFICIENT_CREDITS", credits: currentCredits }, 402);
      }
    }

    // 2. Find a free slug.
    const base = slugify(body.firstName, body.lastName);
    let slug = base;
    let found = false;
    for (let i = 0; i < 30; i++) {
      const candidate = i === 0 ? base : `${base}-${i + 1}`;
      const existing = await db.get(`memorials/${candidate}`);
      if (!existing.exists) {
        slug = candidate;
        found = true;
        break;
      }
    }
    if (!found) return json(env, { error: "SLUG_EXHAUSTED" }, 500);

    // 3. Atomically create the memorial and (unless admin) deduct credits.
    //    Preconditions guard against a concurrent request changing either
    //    document between our reads above and this write; on conflict we
    //    just retry the whole thing with fresh reads.
    try {
      const writes: FirestoreWrite[] = [
        {
          updatePath: `memorials/${slug}`,
          fields: {
            slug: fsString(slug),
            ownerId: fsString(user.uid),
            ownerEmail: user.email ? fsString(user.email) : fsNull(),
            firstName: fsString(body.firstName.trim()),
            lastName: fsString(body.lastName.trim()),
            fatherName: optString(body.fatherName),
            motherName: optString(body.motherName),
            spouseName: optString(body.spouseName),
            childrenNames: optString(body.childrenNames),
            occupation: optString(body.occupation),
            burialPlace: optString(body.burialPlace),
            birthDate: fsString(body.birthDate),
            deathDate: fsString(body.deathDate),
            lifeStory: optString(body.lifeStory),
            lifeStoryAudioUrl: fsNull(),
            videoUrl: optString(body.videoUrl),
            coverPhotoUrl: fsNull(),
            graveImageUrl: fsNull(),
            graveMapUrl: optString(body.graveMapUrl),
            tehilimChapter: optChapter(body.tehilimChapter),
            memoryWallEnabled: fsBool(false),
            published: fsBool(true),
            createdAt: fsTimestamp(new Date()),
            updatedAt: fsTimestamp(new Date()),
          },
          precondition: { exists: false } as const,
        },
      ];

      if (!isAdmin) {
        writes.push({
          updatePath: `users/${user.uid}`,
          fields: { credits: fsInt(currentCredits - CREDITS_PER_MEMORIAL) },
          precondition: creditsUpdateTime
            ? ({ updateTime: creditsUpdateTime } as const)
            : ({ exists: false } as const),
        });
      }

      await db.commit(writes);
      return json(env, { slug });
    } catch (err) {
      if (isFailedPrecondition(err) && attempt < MAX_ATTEMPTS - 1) {
        continue; // someone else touched credits or grabbed this slug — retry fresh
      }
      console.error(err);
      return json(env, { error: "CREATE_FAILED" }, 500);
    }
  }

  return json(env, { error: "CREATE_FAILED_RETRY_EXCEEDED" }, 500);
}

/**
 * Enables the "share a memory" feature on one page — a paid, per-page
 * add-on (unlike memorial creation, this is opt-in after the page already
 * exists, so it's a separate charge). `memoryWallEnabled` is intentionally
 * NOT settable via the client's normal memorial `update` — firestore.rules
 * pins it immutable for owner writes — so this Worker path (bypassing the
 * rules via the service account, same as create-memorial) is the only way
 * it can ever flip to true.
 */
async function handleEnableMemoryWall(request: Request, env: Env): Promise<Response> {
  const token = getBearerToken(request);
  if (!token) return json(env, { error: "UNAUTHENTICATED" }, 401);

  let user;
  try {
    user = await verifyFirebaseIdToken(token, env.FIREBASE_PROJECT_ID);
  } catch {
    return json(env, { error: "INVALID_TOKEN" }, 401);
  }

  const body = (await request.json().catch(() => null)) as { slug?: string } | null;
  const slug = body?.slug;
  if (!slug || typeof slug !== "string") {
    return json(env, { error: "INVALID_INPUT" }, 400);
  }

  const isAdmin = user.email === env.ADMIN_EMAIL;
  const db = await getFirestoreClient(env);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const memorialDoc = await db.get(`memorials/${slug}`);
    if (!memorialDoc.exists) return json(env, { error: "MEMORIAL_NOT_FOUND" }, 404);
    if (memorialDoc.fields.ownerId !== user.uid) {
      return json(env, { error: "FORBIDDEN" }, 403);
    }
    if (memorialDoc.fields.memoryWallEnabled === true) {
      return json(env, { alreadyEnabled: true });
    }

    let currentCredits = 0;
    let creditsUpdateTime: string | undefined;
    if (!isAdmin) {
      const userDoc = await db.get(`users/${user.uid}`);
      if (userDoc.exists) {
        currentCredits = Number(userDoc.fields.credits ?? 0);
        creditsUpdateTime = userDoc.updateTime;
      }
      if (currentCredits < MEMORY_WALL_COST) {
        return json(env, { error: "INSUFFICIENT_CREDITS", credits: currentCredits }, 402);
      }
    }

    try {
      const writes: FirestoreWrite[] = [
        {
          updatePath: `memorials/${slug}`,
          fields: { memoryWallEnabled: fsBool(true) },
          updateMask: ["memoryWallEnabled"],
          precondition: { updateTime: memorialDoc.updateTime },
        },
      ];

      if (!isAdmin) {
        writes.push({
          updatePath: `users/${user.uid}`,
          fields: { credits: fsInt(currentCredits - MEMORY_WALL_COST) },
          precondition: creditsUpdateTime
            ? ({ updateTime: creditsUpdateTime } as const)
            : ({ exists: false } as const),
        });
      }

      await db.commit(writes);
      return json(env, { success: true });
    } catch (err) {
      if (isFailedPrecondition(err) && attempt < MAX_ATTEMPTS - 1) {
        continue; // someone else touched credits or the memorial doc — retry fresh
      }
      console.error(err);
      return json(env, { error: "ENABLE_FAILED" }, 500);
    }
  }

  return json(env, { error: "ENABLE_FAILED_RETRY_EXCEEDED" }, 500);
}

async function handlePurchaseCredits(request: Request, env: Env): Promise<Response> {
  const token = getBearerToken(request);
  if (!token) return json(env, { error: "UNAUTHENTICATED" }, 401);

  let user;
  try {
    user = await verifyFirebaseIdToken(token, env.FIREBASE_PROJECT_ID);
  } catch {
    return json(env, { error: "INVALID_TOKEN" }, 401);
  }

  const body = (await request.json().catch(() => null)) as { orderID?: string; credits?: number } | null;
  const orderID = body?.orderID;
  const credits = Number(body?.credits);
  if (!orderID || !Number.isInteger(credits) || credits < 1) {
    return json(env, { error: "INVALID_INPUT" }, 400);
  }

  const db = await getFirestoreClient(env);

  // Idempotency: if this PayPal order was already processed (e.g. a retried
  // network request), don't credit the account twice.
  const existingPurchase = await db.get(`purchases/${orderID}`);
  if (existingPurchase.exists) {
    const userDoc = await db.get(`users/${user.uid}`);
    const balance = userDoc.exists ? Number(userDoc.fields.credits ?? 0) : 0;
    return json(env, { newBalance: balance });
  }

  let captured;
  try {
    captured = await capturePayPalOrder(
      orderID,
      env.PAYPAL_CLIENT_ID,
      env.PAYPAL_CLIENT_SECRET,
      env.PAYPAL_API_BASE
    );
  } catch (err) {
    console.error(err);
    return json(env, { error: "PAYMENT_CAPTURE_FAILED" }, 402);
  }

  // 1 credit == 1 ILS — verify what PayPal actually captured, not what the
  // client claims, before crediting anything.
  if (captured.currency !== "ILS" || captured.amount !== credits) {
    console.error("Amount mismatch", captured, credits);
    return json(env, { error: "AMOUNT_MISMATCH" }, 400);
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const userDoc = await db.get(`users/${user.uid}`);
    const currentCredits = userDoc.exists ? Number(userDoc.fields.credits ?? 0) : 0;
    const newBalance = currentCredits + credits;

    try {
      await db.commit([
        {
          updatePath: `users/${user.uid}`,
          fields: { credits: fsInt(newBalance) },
          precondition: userDoc.exists
            ? ({ updateTime: userDoc.updateTime } as const)
            : ({ exists: false } as const),
        },
        {
          updatePath: `purchases/${orderID}`,
          fields: {
            uid: fsString(user.uid),
            credits: fsInt(credits),
            amount: fsInt(captured.amount),
            currency: fsString(captured.currency),
            createdAt: fsTimestamp(new Date()),
          },
          precondition: { exists: false } as const,
        },
      ]);
      return json(env, { newBalance });
    } catch (err) {
      if (isFailedPrecondition(err) && attempt < MAX_ATTEMPTS - 1) {
        continue;
      }
      console.error(err);
      return json(env, { error: "CREDIT_FAILED" }, 500);
    }
  }

  return json(env, { error: "CREDIT_FAILED_RETRY_EXCEEDED" }, 500);
}

function normalizeEmail(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim().toLowerCase() : null;
}

/**
 * Admin-only: look up any user by email — their credit balance and whether
 * their account is currently blocked. Resolving email -> uid goes through
 * Identity Toolkit (Firestore has no index on email, and credits are keyed
 * by uid), then the balance comes from Firestore as usual.
 */
async function handleAdminLookupUser(request: Request, env: Env): Promise<Response> {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = normalizeEmail(body?.email);
  if (!email) return json(env, { error: "INVALID_INPUT" }, 400);

  let found;
  try {
    const idToolkitToken = await getIdentityToolkitToken(env);
    found = await lookupUserByEmail(email, idToolkitToken, env.FIREBASE_PROJECT_ID);
  } catch (err) {
    console.error(err);
    return json(env, { error: "LOOKUP_FAILED" }, 500);
  }
  if (!found) return json(env, { error: "USER_NOT_FOUND" }, 404);

  const db = await getFirestoreClient(env);
  const userDoc = await db.get(`users/${found.uid}`);
  const credits = userDoc.exists ? Number(userDoc.fields.credits ?? 0) : 0;

  return json(env, { uid: found.uid, email, credits, blocked: found.disabled });
}

/**
 * Admin-only: directly set a user's credit balance (add, reduce, or clear
 * to 0) by email. Unlike every other credits write in this Worker, this one
 * is intentionally not tied to any verified real-world event (a payment, a
 * page action) — it's a manual override, and it's safe only because it's
 * gated to the one trusted admin account.
 */
async function handleAdminSetCredits(request: Request, env: Env): Promise<Response> {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as
    | { email?: string; credits?: number }
    | null;
  const email = normalizeEmail(body?.email);
  const credits = Number(body?.credits);
  if (!email || !Number.isInteger(credits) || credits < 0) {
    return json(env, { error: "INVALID_INPUT" }, 400);
  }

  let found;
  try {
    const idToolkitToken = await getIdentityToolkitToken(env);
    found = await lookupUserByEmail(email, idToolkitToken, env.FIREBASE_PROJECT_ID);
  } catch (err) {
    console.error(err);
    return json(env, { error: "LOOKUP_FAILED" }, 500);
  }
  if (!found) return json(env, { error: "USER_NOT_FOUND" }, 404);

  const db = await getFirestoreClient(env);
  try {
    await db.commit([
      {
        updatePath: `users/${found.uid}`,
        fields: { credits: fsInt(credits) },
        updateMask: ["credits"],
      },
    ]);
  } catch (err) {
    console.error(err);
    return json(env, { error: "SET_CREDITS_FAILED" }, 500);
  }

  return json(env, { success: true, uid: found.uid, credits });
}

/**
 * Admin-only: block or unblock an account by email — e.g. someone
 * repeatedly creating inappropriate pages. Disabling the Firebase Auth
 * account prevents all future sign-in; it does not retroactively invalidate
 * an already-issued ID token (those simply expire on their own, within an
 * hour).
 */
async function handleAdminSetBlocked(request: Request, env: Env): Promise<Response> {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as
    | { email?: string; blocked?: boolean }
    | null;
  const email = normalizeEmail(body?.email);
  const blocked = body?.blocked;
  if (!email || typeof blocked !== "boolean") {
    return json(env, { error: "INVALID_INPUT" }, 400);
  }

  try {
    const idToolkitToken = await getIdentityToolkitToken(env);
    const found = await lookupUserByEmail(email, idToolkitToken, env.FIREBASE_PROJECT_ID);
    if (!found) return json(env, { error: "USER_NOT_FOUND" }, 404);
    await setUserDisabled(found.uid, blocked, idToolkitToken, env.FIREBASE_PROJECT_ID);
    return json(env, { success: true, uid: found.uid, blocked });
  } catch (err) {
    console.error(err);
    return json(env, { error: "SET_BLOCKED_FAILED" }, 500);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(env) });
    }

    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/api/create-memorial") {
      return handleCreateMemorial(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/enable-memory-wall") {
      return handleEnableMemoryWall(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/purchase-credits") {
      return handlePurchaseCredits(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/admin/lookup-user") {
      return handleAdminLookupUser(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/admin/set-credits") {
      return handleAdminSetCredits(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/admin/set-blocked") {
      return handleAdminSetBlocked(request, env);
    }
    return json(env, { error: "NOT_FOUND" }, 404);
  },
};
