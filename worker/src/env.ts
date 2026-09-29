export interface Env {
  // Non-secret vars (wrangler.toml [vars])
  FIREBASE_PROJECT_ID: string;
  ALLOWED_ORIGIN: string;
  // reem.bi SSO (login.reembir.com) — the only identity provider. Every
  // request's Bearer token is verified against its /api/userinfo.
  REEM_AUTH_ORIGIN: string;
  REEM_CLIENT_ID: string;

  // Secrets (set via `wrangler secret put`, never committed)
  GOOGLE_SERVICE_ACCOUNT_EMAIL: string;
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: string;
}
