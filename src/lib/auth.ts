import { create } from "zustand";

/* ------------------------------------------------------------------ *
 * Cognito Hosted UI, authorization-code + PKCE, hand-rolled.
 *
 * Not Amplify: this needs ~150 lines and Amplify would add hundreds of
 * kilobytes to a bundle that is already large. The app client is PUBLIC
 * (no secret), which is the only correct choice for a static SPA.
 *
 * If the Cognito env vars are absent the whole module degrades to
 * "auth disabled" and the app runs exactly as it does offline — that is
 * what keeps `npm run dev` working with no AWS at all.
 * ------------------------------------------------------------------ */

export interface AuthConfig {
  domain: string; // e.g. learn-duo1c.auth.ap-south-1.amazoncognito.com
  clientId: string;
  redirectUri: string;
  apiUrl: string;
}

function readConfig(): AuthConfig | null {
  const domain = import.meta.env.VITE_COGNITO_DOMAIN as string | undefined;
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined;
  const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
  // Google is the only identity provider, so a pool without it cannot be
  // signed into. Better to render no button at all than one that bounces the
  // reader to a Cognito error page.
  const googleReady = import.meta.env.VITE_GOOGLE_ENABLED === "true";
  if (!domain || !clientId || !apiUrl || !googleReady) return null;
  return {
    domain: domain.replace(/^https?:\/\//, "").replace(/\/$/, ""),
    clientId,
    apiUrl: apiUrl.replace(/\/$/, ""),
    // The redirect must match a callback URL registered on the app client.
    // Using origin + "/" keeps one entry valid for every hash route.
    redirectUri: window.location.origin + "/",
  };
}

export const authConfig = readConfig();
export const authEnabled = authConfig !== null;

/* ---- Token storage ------------------------------------------------- *
 * localStorage, which is the standard trade for a static SPA with no
 * backend-for-frontend: an XSS would expose the refresh token. Mitigated
 * by a strict CSP on CloudFront and by keeping token lifetimes short.   */

const TOKENS_KEY = "learn-duo1c-tokens";
const VERIFIER_KEY = "learn-duo1c-pkce";

interface Tokens {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
  /** Epoch ms. */
  expiresAt: number;
}

function loadTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(TOKENS_KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}

function saveTokens(t: Tokens | null) {
  if (t) localStorage.setItem(TOKENS_KEY, JSON.stringify(t));
  else localStorage.removeItem(TOKENS_KEY);
}

/* ---- PKCE ---------------------------------------------------------- */

function base64url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function randomVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64url(bytes.buffer);
}

async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return base64url(digest);
}

/* ---- Claims -------------------------------------------------------- */

export interface Profile {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}

function decodeIdToken(idToken: string): Profile | null {
  try {
    const [, payload] = idToken.split(".");
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const claims = JSON.parse(json) as Record<string, unknown>;
    if (typeof claims.sub !== "string") return null;
    return {
      sub: claims.sub,
      email: typeof claims.email === "string" ? claims.email : undefined,
      name: typeof claims.name === "string" ? claims.name : undefined,
      picture: typeof claims.picture === "string" ? claims.picture : undefined,
    };
  } catch {
    return null;
  }
}

/* ---- Store --------------------------------------------------------- */

interface AuthState {
  ready: boolean;
  profile: Profile | null;
  busy: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => void;
  init: () => Promise<void>;
}

export const useAuth = create<AuthState>()((set) => ({
  ready: !authEnabled,
  profile: null,
  busy: false,
  error: null,

  /** Completes a redirect if we are on one, otherwise restores a session. */
  init: async () => {
    if (!authConfig) {
      set({ ready: true });
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const err = params.get("error_description") ?? params.get("error");

    if (err) {
      stripAuthParams();
      set({ ready: true, error: err });
      return;
    }

    if (code) {
      set({ busy: true });
      try {
        const tokens = await exchangeCode(authConfig, code);
        saveTokens(tokens);
        set({ profile: decodeIdToken(tokens.idToken) });
      } catch (e) {
        set({ error: e instanceof Error ? e.message : "Sign-in failed" });
      } finally {
        stripAuthParams();
        localStorage.removeItem(VERIFIER_KEY);
        set({ busy: false, ready: true });
      }
      return;
    }

    const existing = loadTokens();
    if (existing) {
      const fresh = await ensureFresh(authConfig, existing);
      if (fresh) set({ profile: decodeIdToken(fresh.idToken) });
      else saveTokens(null);
    }
    set({ ready: true });
  },

  signIn: async () => {
    if (!authConfig) return;
    const verifier = randomVerifier();
    localStorage.setItem(VERIFIER_KEY, verifier);
    const challenge = await challengeFor(verifier);
    const url = new URL(`https://${authConfig.domain}/oauth2/authorize`);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", authConfig.clientId);
    url.searchParams.set("redirect_uri", authConfig.redirectUri);
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    // Skip the Cognito account chooser and go straight to Google.
    url.searchParams.set("identity_provider", "Google");
    // Preserve where the reader was so we can restore it after the round trip.
    url.searchParams.set("state", encodeURIComponent(window.location.hash));
    window.location.assign(url.toString());
  },

  signOut: () => {
    saveTokens(null);
    set({ profile: null });
    if (!authConfig) return;
    const url = new URL(`https://${authConfig.domain}/logout`);
    url.searchParams.set("client_id", authConfig.clientId);
    url.searchParams.set("logout_uri", authConfig.redirectUri);
    window.location.assign(url.toString());
  },
}));

/** Removes ?code/?state from the URL without losing the hash route. */
function stripAuthParams() {
  const params = new URLSearchParams(window.location.search);
  const state = params.get("state");
  const hash = state ? decodeURIComponent(state) : window.location.hash;
  window.history.replaceState(
    null,
    "",
    window.location.pathname + (hash || ""),
  );
}

async function exchangeCode(cfg: AuthConfig, code: string): Promise<Tokens> {
  const verifier = localStorage.getItem(VERIFIER_KEY);
  if (!verifier) throw new Error("Missing PKCE verifier — start sign-in again");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: cfg.clientId,
    code,
    redirect_uri: cfg.redirectUri,
    code_verifier: verifier,
  });

  const res = await fetch(`https://${cfg.domain}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Token exchange failed (${res.status})`);
  const json = (await res.json()) as {
    id_token: string;
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  return {
    idToken: json.id_token,
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
}

async function refresh(cfg: AuthConfig, t: Tokens): Promise<Tokens | null> {
  if (!t.refreshToken) return null;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: cfg.clientId,
    refresh_token: t.refreshToken,
  });
  const res = await fetch(`https://${cfg.domain}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    id_token: string;
    access_token: string;
    expires_in: number;
  };
  // A refresh response carries no new refresh_token — keep the old one.
  return {
    idToken: json.id_token,
    accessToken: json.access_token,
    refreshToken: t.refreshToken,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
}

/** Refreshes with a 60s safety margin. Returns null if the session is dead. */
async function ensureFresh(cfg: AuthConfig, t: Tokens): Promise<Tokens | null> {
  if (t.expiresAt - 60_000 > Date.now()) return t;
  const next = await refresh(cfg, t);
  saveTokens(next);
  return next;
}

/** The bearer token for API calls, or null when signed out. */
export async function getIdToken(): Promise<string | null> {
  if (!authConfig) return null;
  const t = loadTokens();
  if (!t) return null;
  const fresh = await ensureFresh(authConfig, t);
  if (!fresh) {
    useAuth.setState({ profile: null });
    return null;
  }
  return fresh.idToken;
}
