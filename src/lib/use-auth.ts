"use client";

import { useSyncExternalStore } from "react";
import { signInWithCustomToken, signOut } from "firebase/auth";
import { auth as firebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { fetchAccount, type AccountStatus } from "@/lib/worker-api";

// Sign-in is reem.bi (login.reembir.com), the central SSO. Its SDK handles
// the whole OAuth flow (redirect, PKCE, token storage); this module just
// loads it, mirrors its user into React, and signs Firebase in with the
// custom token reem.bi mints (uid = reem.bi user id), since memorial edits
// go straight from the browser to Firestore.

const SDK_URL = "https://login.reembir.com/sdk.js";
export const REEM_CLIENT_ID = "zikaron";

type ReemUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatar: string | null;
  plan: { id: string; name: string } | null;
  features: Record<string, unknown>;
};

type ReemAuthClient = {
  user: ReemUser | null | undefined;
  error?: string | null;
  ready: Promise<unknown>;
  onChange(cb: (user: ReemUser | null) => void): unknown;
  login(opts?: { returnTo?: string; prompt?: string }): void;
  logout(): Promise<void>;
  getToken(): string | null | Promise<string | null>;
  getFirebaseToken(): Promise<string>;
  accountUrl(): string;
};

declare global {
  interface Window {
    ReemAuth?: { init(opts: { clientId: string; redirectUri?: string }): ReemAuthClient };
  }
}

export type SiteUser = {
  uid: string;
  email: string | null;
  name: string | null;
  avatar: string | null;
  planName: string | null;
};

type AuthState = {
  /** loading: not known yet · ready: known (user may be null) · unavailable: SSO didn't load */
  status: "loading" | "ready" | "unavailable";
  user: SiteUser | null;
  /** e.g. "no_access" after a failed sign-in round trip */
  error: string | null;
  /** Limits/usage from the Worker; null while unknown or if it failed. */
  account: AccountStatus | null;
};

let state: AuthState = { status: "loading", user: null, error: null, account: null };
const listeners = new Set<() => void>();
let client: ReemAuthClient | null = null;
let started = false;
let generation = 0;

function setState(patch: Partial<AuthState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function loadSdk(): Promise<void> {
  if (window.ReemAuth) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    const timer = setTimeout(() => reject(new Error("timeout")), 15000);
    script.onload = () => {
      clearTimeout(timer);
      resolve();
    };
    script.onerror = () => {
      clearTimeout(timer);
      reject(new Error("load failed"));
    };
    document.head.appendChild(script);
  });
}

async function syncFirebase(user: ReemUser | null) {
  if (!isFirebaseConfigured) return;
  await firebaseAuth.authStateReady();
  const current = firebaseAuth.currentUser;
  if (!user) {
    // Also clears any leftover pre-reem.bi Google session.
    if (current) await signOut(firebaseAuth);
    return;
  }
  if (current?.uid === user.id) return;
  try {
    await signInWithCustomToken(firebaseAuth, await client!.getFirebaseToken());
  } catch (err) {
    if ((err as { code?: string }).code === "not_configured") {
      console.warn("reem.bi: Firebase custom tokens are not configured for this site");
    } else {
      console.error(err);
    }
    if (current) await signOut(firebaseAuth);
  }
}

async function handleUserChange(user: ReemUser | null) {
  const gen = ++generation;
  await syncFirebase(user).catch(console.error);
  // Also runs the one-time move of pre-reem.bi pages/credits to this user,
  // so it has to finish before pages query "my memorials".
  const account = user ? await fetchAccount().catch(() => null) : null;
  if (gen !== generation) return;
  setState({
    status: "ready",
    account,
    user: user
      ? {
          uid: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          planName: user.plan?.name ?? null,
        }
      : null,
  });
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  loadSdk()
    .then(() => {
      if (!window.ReemAuth) throw new Error("ReemAuth missing");
      client = window.ReemAuth.init({ clientId: REEM_CLIENT_ID });
      if (client.error) setState({ error: client.error });
      client.onChange((u) => void handleUserChange(u));
    })
    .catch((err) => {
      console.error("reem.bi sign-in unavailable:", err);
      setState({ status: "unavailable", user: null });
      // Still drop any stale Firebase session so nothing looks signed in.
      void syncFirebase(null).catch(() => {});
    });
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const serverState: AuthState = { status: "loading", user: null, error: null, account: null };

export function useCurrentUser() {
  const s = useSyncExternalStore(
    subscribe,
    () => state,
    () => serverState
  );
  return {
    user: s.user,
    loading: s.status === "loading",
    unavailable: s.status === "unavailable",
    error: s.error,
    account: s.account,
  };
}

export function signIn(): void {
  // returnTo keeps the query string (e.g. /memorial?slug=…), which the
  // default redirect URI (origin + pathname) would drop.
  client?.login({ returnTo: window.location.href });
}

export async function signOutUser(): Promise<void> {
  await client?.logout();
  if (isFirebaseConfigured && firebaseAuth.currentUser) await signOut(firebaseAuth);
}

/** reem.bi Bearer token for Worker calls. */
export async function getAuthToken(): Promise<string> {
  const token = client ? await client.getToken() : null;
  if (!token) throw new Error("NOT_SIGNED_IN");
  return token;
}

export function accountUrl(): string {
  return client?.accountUrl() ?? "https://login.reembir.com";
}

/** Re-reads limits/usage after something changed them (e.g. a new page). */
export async function refreshAccount(): Promise<void> {
  if (!state.user) return;
  const account = await fetchAccount().catch(() => null);
  setState({ account });
}
