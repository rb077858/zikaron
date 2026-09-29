import { getAuthToken } from "@/lib/use-auth";
import type { MemorialFormInput } from "@/lib/memorials";

// Calls to the Cloudflare Worker — the only thing allowed to create
// memorials or turn on "share a memory", since those are limited by the
// user's reem.bi plan and a browser can't be trusted to enforce that.
// Every call carries the reem.bi token, which the Worker verifies with
// login.reembir.com.

export type AccountStatus = {
  memorialCount: number;
  /** null = unlimited */
  maxMemorials: number | null;
  memoryWall: boolean;
  /** Leftover balance from the old paid credits (no longer sold). */
  credits: number;
};

export const LEGACY_CREDITS_PER_MEMORIAL = 5;
export const LEGACY_MEMORY_WALL_COST = 2;

const WORKER_URL = (process.env.NEXT_PUBLIC_WORKER_URL || "").replace(/\/$/, "");

/**
 * Any non-OK response from the Worker. `code` is the Worker's raw error
 * string (see worker/src/index.ts), e.g. LIMIT_REACHED, NOT_IN_PLAN,
 * NO_ACCESS, so callers can show a specific message.
 */
export class WorkerRequestError extends Error {
  constructor(
    public code: string,
    public status: number
  ) {
    super(code);
  }
}

async function workerFetch(path: string, body: unknown) {
  if (!WORKER_URL) {
    throw new Error(
      "NEXT_PUBLIC_WORKER_URL is not configured — see README for Cloudflare Worker setup"
    );
  }
  const res = await fetch(`${WORKER_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await getAuthToken()}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new WorkerRequestError((data as { error?: string }).error || `HTTP_${res.status}`, res.status);
  }
  return data;
}

/** Limits and usage; the first call after sign-in also migrates pre-reem.bi data. */
export async function fetchAccount(): Promise<AccountStatus> {
  return (await workerFetch("/api/account", {})) as AccountStatus;
}

export function canCreateMemorial(a: AccountStatus): boolean {
  return (
    a.maxMemorials === null ||
    a.memorialCount < a.maxMemorials ||
    a.credits >= LEGACY_CREDITS_PER_MEMORIAL
  );
}

export async function createMemorialViaWorker(fields: MemorialFormInput): Promise<string> {
  const data = await workerFetch("/api/create-memorial", fields);
  return (data as { slug: string }).slug;
}

/**
 * Turns on "share a memory" for one page. memoryWallEnabled can only ever
 * be flipped on by the Worker (firestore.rules pins it for direct client
 * updates), so there's no way around the plan check.
 */
export async function enableMemoryWallViaWorker(slug: string): Promise<void> {
  await workerFetch("/api/enable-memory-wall", { slug });
}
