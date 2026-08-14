import { createRemoteJWKSet, jwtVerify } from "jose";

// Firebase ID tokens are RS256 JWTs signed with Google's securetoken keys.
// Verifying them here (rather than trusting whatever uid the client claims)
// is what makes it safe for this Worker to act as the only writer of
// memorials/credits: we know for certain which real, signed-in user is
// making the request.
const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

export type VerifiedUser = { uid: string; email: string | null };

export async function verifyFirebaseIdToken(
  idToken: string,
  projectId: string
): Promise<VerifiedUser> {
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });
  if (!payload.sub) throw new Error("Token missing subject");
  return {
    uid: payload.sub,
    email: typeof payload.email === "string" ? payload.email : null,
  };
}

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer (.+)$/);
  return match ? match[1] : null;
}
