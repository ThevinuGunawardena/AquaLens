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
  try {
    cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    cachedToken = null;
  }
  return cachedToken;
}

export async function saveToken(token: string): Promise<void> {
  cachedToken = token;
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Non-fatal — the session just won't survive an app restart.
  }
}

export async function clearToken(): Promise<void> {
  cachedToken = null;
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function getCachedToken(): string | null {
  return cachedToken;
}
