import { workerFetch } from "@/lib/credits";

export type AdminUserInfo = {
  uid: string;
  email: string;
  credits: number;
  blocked: boolean;
};

/**
 * Every function here is gated server-side in the Worker (only the account
 * matching ADMIN_EMAIL can call these) — the client-side ADMIN_EMAIL check
 * elsewhere is purely for showing/hiding the UI, not a security boundary.
 */
export async function adminLookupUser(idToken: string, email: string): Promise<AdminUserInfo> {
  return (await workerFetch("/api/admin/lookup-user", idToken, { email })) as AdminUserInfo;
}

export async function adminSetCredits(
  idToken: string,
  email: string,
  credits: number
): Promise<void> {
  await workerFetch("/api/admin/set-credits", idToken, { email, credits });
}

export async function adminSetBlocked(
  idToken: string,
  email: string,
  blocked: boolean
): Promise<void> {
  await workerFetch("/api/admin/set-blocked", idToken, { email, blocked });
}
