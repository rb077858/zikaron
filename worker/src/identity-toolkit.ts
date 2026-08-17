// Admin-only user lookups and account blocking, via the Identity Toolkit
// REST API (the same API the Firebase Admin SDK uses under the hood for
// `getUserByEmail`/`updateUser`). Requires an OAuth2 access token from the
// service account with the "Firebase Authentication Admin" IAM role — a
// separate permission from the Firestore access already used elsewhere in
// this Worker, so it needs its own token (see google-token.ts's `scope`
// parameter) and its own IAM grant (see README).

export type IdentityToolkitUser = {
  uid: string;
  disabled: boolean;
};

export async function lookupUserByEmail(
  email: string,
  accessToken: string,
  projectId: string
): Promise<IdentityToolkitUser | null> {
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
  const data = (await res.json()) as { users?: Array<{ localId: string; disabled?: boolean }> };
  const user = data.users?.[0];
  return user ? { uid: user.localId, disabled: !!user.disabled } : null;
}

export async function setUserDisabled(
  uid: string,
  disabled: boolean,
  accessToken: string,
  projectId: string
): Promise<void> {
  const res = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:update", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ localId: uid, disableUser: disabled, targetProjectId: projectId }),
  });
  if (!res.ok) {
    throw new Error(`identitytoolkit update failed: ${res.status} ${await res.text()}`);
  }
}
