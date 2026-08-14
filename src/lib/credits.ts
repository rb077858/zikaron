import { doc, getDoc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MemorialFormInput } from "@/lib/memorials";

// Display-only — NOT a security boundary. The Worker independently checks
// the verified token's email before granting free/unlimited creation; a
// client that lies about this gets nothing, since it can't write memorials
// or credits directly (see firestore.rules).
export const ADMIN_EMAIL = "rb077858@gmail.com";

export const CREDITS_PER_MEMORIAL = 5;

const WORKER_URL = (process.env.NEXT_PUBLIC_WORKER_URL || "").replace(/\/$/, "");

export async function getMyCredits(uid: string): Promise<number> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? ((snap.data().credits as number) ?? 0) : 0;
}

export function subscribeToCredits(uid: string, cb: (credits: number) => void): Unsubscribe {
  return onSnapshot(doc(db, "users", uid), (snap) => {
    cb(snap.exists() ? ((snap.data().credits as number) ?? 0) : 0);
  });
}

export class InsufficientCreditsError extends Error {
  constructor(public credits: number) {
    super("INSUFFICIENT_CREDITS");
  }
}

async function workerFetch(path: string, idToken: string, body: unknown) {
  if (!WORKER_URL) {
    throw new Error(
      "NEXT_PUBLIC_WORKER_URL is not configured — see README for Cloudflare Worker setup"
    );
  }
  const res = await fetch(`${WORKER_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 402) {
      throw new InsufficientCreditsError((data as { credits?: number }).credits ?? 0);
    }
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data;
}

/**
 * Creates a memorial through the trusted Cloudflare Worker, which checks the
 * caller's credit balance (or admin status) and atomically deducts credits +
 * creates the page — this can't happen as a direct client→Firestore write
 * (see firestore.rules: memorials `create` is denied for everyone but the
 * Worker's own service-account access).
 */
export async function createMemorialViaWorker(
  idToken: string,
  fields: MemorialFormInput
): Promise<string> {
  const data = await workerFetch("/api/create-memorial", idToken, fields);
  return (data as { slug: string }).slug;
}

export async function purchaseCreditsViaWorker(
  idToken: string,
  orderID: string,
  credits: number
): Promise<number> {
  const data = await workerFetch("/api/purchase-credits", idToken, { orderID, credits });
  return (data as { newBalance: number }).newBalance;
}
