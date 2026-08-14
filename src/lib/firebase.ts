import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";

// Only Auth + Firestore — both free on Firebase's Spark plan with no credit
// card required. File uploads go to Cloudinary instead (see cloudinary.ts),
// since Firebase Storage requires the paid Blaze plan even for tiny usage.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase Auth touches `window` on construction, which doesn't exist during
// Next.js's server-side render pass of client components. We only ever call
// auth/db methods from useEffect/event handlers (browser-only), so it is
// safe to lazily no-op on the server and initialize for real in the browser.
const isBrowser = typeof window !== "undefined";

export const firebaseApp: FirebaseApp | undefined = isBrowser
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : undefined;

export const auth: Auth = isBrowser
  ? getAuth(firebaseApp as FirebaseApp)
  : (undefined as unknown as Auth);
export const db: Firestore = isBrowser
  ? getFirestore(firebaseApp as FirebaseApp)
  : (undefined as unknown as Firestore);

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

// For local development against `firebase emulators:start` — set
// NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true in .env to avoid touching a real
// Firebase project while developing.
if (isBrowser && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
  const g = globalThis as unknown as { __zikaronEmulatorsConnected?: boolean };
  if (!g.__zikaronEmulatorsConnected) {
    g.__zikaronEmulatorsConnected = true;
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
  }
}
