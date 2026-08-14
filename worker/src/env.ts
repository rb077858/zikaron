export interface Env {
  // Non-secret vars (wrangler.toml [vars])
  FIREBASE_PROJECT_ID: string;
  PAYPAL_CLIENT_ID: string;
  PAYPAL_API_BASE: string;
  ADMIN_EMAIL: string;
  ALLOWED_ORIGIN: string;

  // Secrets (set via `wrangler secret put`, never committed)
  PAYPAL_CLIENT_SECRET: string;
  GOOGLE_SERVICE_ACCOUNT_EMAIL: string;
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: string;
}
