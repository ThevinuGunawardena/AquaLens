// services/tokenStorage.ts
//
// Persists the JWT returned by the backend (POST /auth/register,
// /auth/login, /auth/google) so the user doesn't have to sign in every
// time they open the app.
//
// Requires @react-native-async-storage/async-storage — see SETUP.md.
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "aquaquest.access_token";

// In-memory cache so `api.ts` can read the token synchronously on every
// request without awaiting AsyncStorage each time.
let cachedToken: string | null = null;

/** Call once, on app start, before rendering anything that calls the API. */
export async function loadToken(): Promise<string | null> {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      cachedToken = window.localStorage.getItem(TOKEN_KEY);
      return cachedToken;
    } catch {
      // ignore
    }
  }
  try {
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 1000),
    );
    cachedToken = await Promise.race([
      AsyncStorage.getItem(TOKEN_KEY),
      timeout,
    ]);
  } catch {
    cachedToken = null;
  }
  return cachedToken;
}

export async function saveToken(token: string): Promise<void> {
  cachedToken = token;
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // ignore
    }
  }
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Non-fatal — the session just won't survive an app restart.
  }
}

export async function clearToken(): Promise<void> {
  cachedToken = null;
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
  }
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function getCachedToken(): string | null {
  return cachedToken;
}
