// Legacy lookup only: before reem.bi, users signed in with Firebase Auth
// (Google), so their pages and credits are keyed by that old Firebase uid.
// On first reem.bi sign-in the Worker finds that old account by email here
// (the same API the Firebase Admin SDK uses for `getUserByEmail`) and moves
// the data over to the new uid. Requires the "Firebase Authentication
// Admin" IAM role on the service account (see README).

export async function lookupUidByEmail(
  email: string,
  accessToken: string,
  projectId: string
): Promise<string | null> {
  const res = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: [email], targetProjectId: projectId }),
  });
  if (!res.ok) {
    if (res.status === 400) {
      // Identity Toolkit returns 400 EMAIL_NOT_FOUND rather than an empty
      // `users` array when nothing matches.
      const body = await res.text().catch(() => "");
      if (body.includes("EMAIL_NOT_FOUND") || body.includes("USER_NOT_FOUND")) return null;
    }
    throw new Error(`identitytoolkit lookup failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { users?: Array<{ localId: string }> };
  return data.users?.[0]?.localId ?? null;
}
