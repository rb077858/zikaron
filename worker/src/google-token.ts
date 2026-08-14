import { SignJWT, importPKCS8 } from "jose";

/**
 * Exchanges a Google service-account key for a short-lived OAuth2 access
 * token (the standard "OAuth 2.0 for Server to Server Applications" flow).
 * A token obtained this way has full IAM-level Firestore access and is NOT
 * subject to Firestore Security Rules — the same trust model the Admin SDK
 * uses. That's exactly why this Worker (not the browser) is the only thing
 * allowed to create memorials or change credit balances.
 */
export async function getGoogleAccessToken(
  clientEmail: string,
  privateKeyPem: string,
  scope: string
): Promise<string> {
  const normalizedKey = privateKeyPem.includes("\\n")
    ? privateKeyPem.replace(/\\n/g, "\n")
    : privateKeyPem;
  const key = await importPKCS8(normalizedKey, "RS256");

  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(clientEmail)
    .setSubject(clientEmail)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!res.ok) {
    throw new Error(`Google OAuth token exchange failed: ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}
