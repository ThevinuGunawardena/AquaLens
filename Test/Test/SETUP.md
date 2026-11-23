# Connecting the app to the backend

This adds email/password **sign in**, **sign up**, and a **first-run tutorial**
(shown right after sign up) wired to the `aqua-quest-backend` FastAPI server.

## What was added

- `services/api.ts` — fetch wrapper that talks to the backend and unwraps its
  `{ success, status, message, data, errors }` response envelope.
- `services/authApi.ts` — `register`, `login`, `google`, `me`.
- `services/tutorialApi.ts` — the onboarding tutorial + "mark complete".
- `services/tokenStorage.ts` — saves the JWT on-device (AsyncStorage) so
  users stay signed in between app launches.
- `app/(auth)/sign-in.tsx`, `app/(auth)/sign-up.tsx` — new screens.
- `app/tutorial.tsx` — the step-by-step walkthrough, fetched from
  `GET /tutorial/upload-photo`. Shown automatically after sign up (and after
  sign in, if the account hasn't seen it yet).
- `app/_layout.tsx` — now restores a saved session on launch and redirects
  between the sign-in flow and the rest of the app.
- `store/authSlice.ts` — extended `User` to match the fields the backend
  returns (xp, level, tutorial_seen, etc.), added a `hydrated` flag.
- `app/(tabs)/settings.tsx` — "Log out" now also clears the saved token.

## 1. Run the backend

```bash
cd aqua-quest-backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # then set JWT_SECRET to any long random string
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

> **Note:** `requirements.txt` was missing `requests`, which `google-auth`
> needs at import time — it's been added. Without it the server fails to
> start with `ImportError: The requests library is not installed`.

Confirm it's up: open `http://127.0.0.1:8000/` — you should see
`{"success":true, ..., "message":"Aqua Quest API is running"}`.

Google Sign-In (`POST /auth/google`) needs `GOOGLE_CLIENT_ID` in `.env` —
this project doesn't add a "Continue with Google" button yet, but the
backend endpoint is ready if you want to wire it in later (see the
backend's own `README.md`).

## 2. Point the app at the backend

Edit `.env` in the Expo project root:

```
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
```

This only works as-is for an **iOS Simulator** on the same Mac as the
server. Otherwise:

| Where the app runs                        | Use this URL                              |
|--------------------------------------------|--------------------------------------------|
| iOS Simulator                               | `http://127.0.0.1:8000`                    |
| Android Emulator                            | `http://10.0.2.2:8000`                     |
| Physical phone (Expo Go), same Wi-Fi        | `http://<your-computer's-LAN-IP>:8000`     |

Find your LAN IP with `ipconfig` (Windows) or `ifconfig`/`ipconfig getifaddr en0` (Mac).
Restart `expo start` after changing `.env` — Expo inlines `EXPO_PUBLIC_*`
vars at start time.

## 3. Install the one new dependency and run

```bash
npx expo install @react-native-async-storage/async-storage
npm start
```

(It's already listed in `package.json`; `expo install` just makes sure you
get the version matched to your Expo SDK.)

## 4. Try it

1. Open the app — you'll land on **Sign In** (no session yet).
2. Tap **Create an account**, fill in name/email/password (8+ chars),
   submit → calls `POST /auth/register`.
3. On success you're taken straight to the **tutorial** screen
   (`GET /tutorial/upload-photo`), since new accounts always have
   `tutorial_seen: false`.
4. Tap **"Got it, let's fish"** (or **Skip**) → calls
   `POST /users/me/tutorial-complete`, then drops you into the tabs.
5. Force-quit and reopen the app — you're still signed in (session restored
   via the saved token + `GET /auth/me`).
6. **Settings → Log out** clears the token and sends you back to Sign In.

## Troubleshooting

- **"Can't reach the server..."** — usually the wrong `EXPO_PUBLIC_API_URL`
  for your device (see table above), the backend isn't running, or a
  firewall is blocking the port. `curl http://<url>:8000/` from the same
  network the phone/emulator is on to sanity check.
- **CORS errors in the web build** — `main.py` already allows all origins
  for local dev (`allow_origins=["*"]`); tighten this before shipping.
