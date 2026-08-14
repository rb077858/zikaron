# zikaron-worker

The one server-side (but serverless — no machine to manage) piece of this
project. It exists solely to enforce things a static site + client-side
Firestore cannot enforce on its own:

- **Creating a memorial costs credits** (or is free for the admin account).
  A browser can't be trusted to "pay before creating" — nothing stops
  someone from just skipping that step in dev tools — so `firestore.rules`
  denies memorial creation entirely, and only this Worker (authenticating to
  Firestore as a trusted service account, bypassing the rules the same way
  the Admin SDK does) is allowed to create one.
- **Buying credits with PayPal** needs the payment to actually be verified
  server-side. The browser creates the PayPal order and gets the buyer's
  approval, but this Worker performs the actual *capture* (using the secret
  PayPal client credentials, never sent to the browser) and only credits the
  account after confirming the real, captured amount.

Everything else in the app (editing, deleting, lighting a candle, uploading
photos) stays a direct, free client→Firestore/Cloudinary operation — this
Worker is deliberately narrow in scope.

See the main [README](../README.md) for the full one-time setup walkthrough
(PayPal Live REST app, Firebase service account, Cloudflare secrets, GitHub
Actions deploy). This file just covers local development.

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars   # fill in real or sandbox values
npm run dev                       # wrangler dev, http://localhost:8787
```

## Deploying by hand (normally CI does this — see the deploy workflow)

```bash
npx wrangler secret put PAYPAL_CLIENT_SECRET
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
npm run deploy
```
