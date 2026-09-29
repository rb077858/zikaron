import type { Env } from "./env";
import {
  verifyReemToken,
  AuthError,
  maxMemorials,
  canUseMemoryWall,
  type VerifiedUser,
} from "./reem-auth";
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
import { slugify } from "./slug";
import { lookupUidByEmail } from "./identity-toolkit";

// Credits are no longer sold (PayPal was removed — upgrades are plans set
// in the reem.bi dashboard). Balances bought before that still work: once
// the plan's limit is reached, a leftover balance is spent at the old rates.
const LEGACY_CREDITS_PER_MEMORIAL = 5;
const LEGACY_MEMORY_WALL_COST = 2;
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

type AuthResult = { ok: true; user: VerifiedUser } | { ok: false; response: Response };

async function authenticate(request: Request, env: Env): Promise<AuthResult> {
  try {
    return { ok: true, user: await verifyReemToken(request, env) };
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, response: json(env, { error: err.code }, err.status) };
    }
    console.error(err);
    return { ok: false, response: json(env, { error: "AUTH_UNAVAILABLE" }, 503) };
  }
}

async function countMemorials(db: FirestoreClient, uid: string): Promise<number> {
  return (await db.queryEqual("memorials", "ownerId", fsString(uid))).length;
}

async function commitInChunks(db: FirestoreClient, writes: FirestoreWrite[]): Promise<void> {
  for (let i = 0; i < writes.length; i += 400) {
    await db.commit(writes.slice(i, i + 400));
  }
}

/**
 * One-time move of pre-reem.bi data. Before the switch, users signed in
 * with Firebase Auth (Google), so their memorials (and the ownerId copies
 * on each photo/memory) and credit balance are keyed by that old Firebase
 * uid. The new uid is the reem.bi user id, so on first sign-in we find the
 * old account by the (same, lowercased) email and re-key everything to the
 * new uid. Idempotent — safe to re-run if a previous attempt was cut short.
 */
async function migrateLegacyData(env: Env, db: FirestoreClient, user: VerifiedUser): Promise<boolean> {
  if (!user.email) return true;

  const legacyUids = new Set<string>();
  let complete = true;
  try {
    const token = await getGoogleAccessToken(
      env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
      "https://www.googleapis.com/auth/identitytoolkit"
    );
    const legacy = await lookupUidByEmail(user.email, token, env.FIREBASE_PROJECT_ID);
    if (legacy && legacy !== user.uid) legacyUids.add(legacy);
  } catch (err) {
    // Most likely the service account lacks "Firebase Authentication
    // Admin". Fall back to memorials' ownerEmail (covers pages, but not a
    // credit balance with no pages) and try again on the next sign-in.
    console.error(err);
    complete = false;
    for (const m of await db.queryEqual("memorials", "ownerEmail", fsString(user.email))) {
      const owner = m.fields.ownerId;
      if (typeof owner === "string" && owner !== user.uid) legacyUids.add(owner);
    }
  }

  for (const legacyUid of legacyUids) {
    const writes: FirestoreWrite[] = [];
    for (const m of await db.queryEqual("memorials", "ownerId", fsString(legacyUid))) {
      writes.push({
        updatePath: m.path,
        fields: { ownerId: fsString(user.uid), ownerEmail: fsString(user.email) },
        updateMask: ["ownerId", "ownerEmail"],
        precondition: { exists: true },
      });
      for (const sub of ["photos", "memories"]) {
        for (const path of await db.listPaths(`${m.path}/${sub}`)) {
          writes.push({
            updatePath: path,
            fields: { ownerId: fsString(user.uid) },
            updateMask: ["ownerId"],
            precondition: { exists: true },
          });
        }
      }
    }
    await commitInChunks(db, writes);

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const oldDoc = await db.get(`users/${legacyUid}`);
      const oldCredits = oldDoc.exists ? Number(oldDoc.fields.credits ?? 0) : 0;
      if (!oldDoc.exists || oldCredits <= 0) break;
      const newDoc = await db.get(`users/${user.uid}`);
      const newCredits = newDoc.exists ? Number(newDoc.fields.credits ?? 0) : 0;
      try {
        await db.commit([
          {
            updatePath: `users/${user.uid}`,
            fields: { credits: fsInt(newCredits + oldCredits) },
            updateMask: ["credits"],
            precondition: newDoc.exists ? { updateTime: newDoc.updateTime } : { exists: false },
          },
          {
            updatePath: `users/${legacyUid}`,
            fields: { credits: fsInt(0), migratedTo: fsString(user.uid) },
            updateMask: ["credits", "migratedTo"],
            precondition: { updateTime: oldDoc.updateTime },
          },
        ]);
        break;
      } catch (err) {
        if (isFailedPrecondition(err) && attempt < MAX_ATTEMPTS - 1) continue;
        throw err;
      }
    }
  }
  return complete;
}

type AccountStatus = {
  memorialCount: number;
  /** null = unlimited */
  maxMemorials: number | null;
  memoryWall: boolean;
  credits: number;
};

async function getAccountStatus(db: FirestoreClient, user: VerifiedUser): Promise<AccountStatus> {
  const [userDoc, memorialCount] = await Promise.all([
    db.get(`users/${user.uid}`),
    countMemorials(db, user.uid),
  ]);
  return {
    memorialCount,
    maxMemorials: maxMemorials(user.features),
    memoryWall: canUseMemoryWall(user.features),
    credits: userDoc.exists ? Number(userDoc.fields.credits ?? 0) : 0,
  };
}

/**
 * Called by the browser right after sign-in: migrates legacy data (first
 * time only) and returns the account's limits for the UI. The limits are
 * display-only there — create/enable below re-check them here.
 */
async function handleAccount(request: Request, env: Env): Promise<Response> {
  const auth = await authenticate(request, env);
  if (!auth.ok) return auth.response;
  const user = auth.user;
  const db = await getFirestoreClient(env);

  try {
    const userDoc = await db.get(`users/${user.uid}`);
    if (!(userDoc.exists && userDoc.fields.legacyChecked === true)) {
      const complete = await migrateLegacyData(env, db, user);
      await db.commit([
        {
          updatePath: `users/${user.uid}`,
          fields: {
            email: user.email ? fsString(user.email) : fsNull(),
            legacyChecked: fsBool(complete),
          },
          updateMask: ["email", "legacyChecked"],
        },
      ]);
    }
  } catch (err) {
    // Never block sign-in on migration; it retries on the next visit.
    console.error(err);
  }

  return json(env, await getAccountStatus(db, user));
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

/**
 * Creates a memorial. Only this Worker may (firestore.rules denies client
 * creates), because the plan limit has to be enforced somewhere the
 * browser can't skip: the page count is checked here, and the user's
 * `users/{uid}` doc is written in the same commit with an updateTime
 * precondition, so two concurrent creates can't both slip under the limit.
 */
async function handleCreateMemorial(request: Request, env: Env): Promise<Response> {
  const auth = await authenticate(request, env);
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const body = (await request.json().catch(() => null)) as MemorialFormInput | null;
  if (!body || !body.firstName?.trim() || !body.lastName?.trim() || !body.birthDate || !body.deathDate) {
    return json(env, { error: "INVALID_INPUT" }, 400);
  }

  const db = await getFirestoreClient(env);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // 1. Check the plan limit (or, past it, a leftover credit balance).
    const userDoc = await db.get(`users/${user.uid}`);
    const currentCredits = userDoc.exists ? Number(userDoc.fields.credits ?? 0) : 0;
    const limit = maxMemorials(user.features);
    const count = limit === null ? 0 : await countMemorials(db, user.uid);
    const withinPlan = limit === null || count < limit;
    const spendCredits = !withinPlan && currentCredits >= LEGACY_CREDITS_PER_MEMORIAL;
    if (!withinPlan && !spendCredits) {
      return json(env, { error: "LIMIT_REACHED", count, limit }, 402);
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

    // 3. Atomically create the memorial and touch the user doc (deducting
    //    credits if they're being spent). On a precondition conflict,
    //    retry the whole thing with fresh reads.
    try {
      const userFields: Record<string, FSValue> = { lastCreatedAt: fsTimestamp(new Date()) };
      if (spendCredits) {
        userFields.credits = fsInt(currentCredits - LEGACY_CREDITS_PER_MEMORIAL);
      }
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
        {
          updatePath: `users/${user.uid}`,
          fields: userFields,
          updateMask: Object.keys(userFields),
          precondition: userDoc.exists
            ? ({ updateTime: userDoc.updateTime } as const)
            : ({ exists: false } as const),
        },
      ];

      await db.commit(writes);
      return json(env, { slug });
    } catch (err) {
      if (isFailedPrecondition(err) && attempt < MAX_ATTEMPTS - 1) {
        continue; // someone else touched the user doc or grabbed this slug — retry fresh
      }
      console.error(err);
      return json(env, { error: "CREATE_FAILED" }, 500);
    }
  }

  return json(env, { error: "CREATE_FAILED_RETRY_EXCEEDED" }, 500);
}

/**
 * Enables "share a memory" on one page. Allowed when the plan includes it
 * (`memory_wall` / `unlimited` in the reem.bi dashboard), or by spending a
 * leftover legacy credit balance. `memoryWallEnabled` can't be flipped on
 * by a direct client write (firestore.rules pins it), so this Worker path
 * is the only way it turns true.
 */
async function handleEnableMemoryWall(request: Request, env: Env): Promise<Response> {
  const auth = await authenticate(request, env);
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const body = (await request.json().catch(() => null)) as { slug?: string } | null;
  const slug = body?.slug;
  if (!slug || typeof slug !== "string") {
    return json(env, { error: "INVALID_INPUT" }, 400);
  }

  const included = canUseMemoryWall(user.features);
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
    if (!included) {
      const userDoc = await db.get(`users/${user.uid}`);
      if (userDoc.exists) {
        currentCredits = Number(userDoc.fields.credits ?? 0);
        creditsUpdateTime = userDoc.updateTime;
      }
      if (currentCredits < LEGACY_MEMORY_WALL_COST) {
        return json(env, { error: "NOT_IN_PLAN" }, 402);
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

      if (!included) {
        writes.push({
          updatePath: `users/${user.uid}`,
          fields: { credits: fsInt(currentCredits - LEGACY_MEMORY_WALL_COST) },
          updateMask: ["credits"],
          precondition: { updateTime: creditsUpdateTime! },
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(env) });
    }

    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/api/account") {
      return handleAccount(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/create-memorial") {
      return handleCreateMemorial(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/enable-memory-wall") {
      return handleEnableMemoryWall(request, env);
    }
    return json(env, { error: "NOT_FOUND" }, 404);
  },
};
