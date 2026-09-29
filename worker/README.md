# zikaron-worker

The one server-side (but serverless — no machine to manage) piece of this
project. It exists solely to enforce things a static site + client-side
Firestore cannot enforce on its own:

- **Who is signed in.** Every request carries the user's reem.bi token
  (login.reembir.com), which the Worker verifies against
  `/api/userinfo` — never trusting user details sent by the browser.
- **Plan limits.** How many memorials a user may own and whether they may
  turn on "share a memory" come from their reem.bi plan (`features`). A
  browser can't be trusted to enforce that, so `firestore.rules` denies
  memorial creation and `memoryWallEnabled` flips, and only this Worker
  (authenticating to Firestore as a trusted service account, bypassing the
  rules the same way the Admin SDK does) performs them.
- **Legacy data.** On a user's first reem.bi sign-in, `/api/account` moves
  pages and credits created under the old Firebase (Google) uid to the new
  reem.bi uid.

Everything else in the app (editing, deleting, uploading photos) stays a
direct, free client→Firestore/Cloudinary operation — this Worker is
deliberately narrow in scope.

See the main [README](../README.md) for the full one-time setup walkthrough
(Firebase service account, Cloudflare secrets, GitHub Actions deploy). This file just covers local development.

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars   # fill in the service account values
npm run dev                       # wrangler dev, http://localhost:8787
```

## Deploying by hand (normally CI does this — see the deploy workflow)

```bash
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
npm run deploy
```
