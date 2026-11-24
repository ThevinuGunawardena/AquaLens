import { ApiError, setAuthToken } from "@/services/api";
import { authApi, type UserDto } from "@/services/authApi";
import { usersApi, type ProfileUpdateInput } from "@/services/tutorialApi";
import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";

interface AuthState {
  user: UserDto | null;
  token: string | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  status: "idle" | "loading" | "error";
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  hydrated: false,
  status: "idle",
  error: null,
};

// ---------------------------------------------------------------------------
// Thunks — for sign-in/sign-up screens to dispatch. Each calls the API
// (which persists the token itself via services/api.ts -> tokenStorage),
// then hands off to the synchronous `login` reducer below so state updates
// the same way regardless of entry point (password login, register,
// google, or the _layout.tsx bootstrap check via fetchMe).
// ---------------------------------------------------------------------------

export const signIn = createAsyncThunk(
  "auth/signIn",
  async (payload: { email: string; password: string }, { dispatch }) => {
    const { user, token } = await authApi.login(
      payload.email,
      payload.password,
    );
    dispatch(login({ user, token }));
    return user;
  },
);

export const signUp = createAsyncThunk(
  "auth/signUp",
  async (
    payload: { name: string; email: string; password: string },
    { dispatch },
  ) => {
    const { user, token } = await authApi.register(
      payload.name,
      payload.email,
      payload.password,
    );
    dispatch(login({ user, token }));
    return user;
  },
);

export const googleSignIn = createAsyncThunk(
  "auth/googleSignIn",
  async (idToken: string, { dispatch }) => {
    const { user, token } = await authApi.google(idToken);
    dispatch(login({ user, token }));
    return user;
  },
);

/** Re-fetch the current user against the token already in state — used by
 * _layout.tsx's bootstrap check and by screens that want a fresh copy. */
export const fetchMe = createAsyncThunk("auth/fetchMe", async () => {
  try {
    return await authApi.me();
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      setAuthToken(null);
    }
    throw err;
  }
});

/** Screens call dispatch(updateProfile({ name, email, phone })) with
 * local-only fields. The backend only persists name/avatar_url today, so
 * those two go to PATCH /users/me and the rest are merged client-side
 * until the API grows fields for them. */
export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (payload: ProfileUpdateInput & Record<string, unknown>) => {
    const { name, avatar_url } = payload;
    const serverUpdates: ProfileUpdateInput = {};
    if (name !== undefined) serverUpdates.name = name;
    if (avatar_url !== undefined) serverUpdates.avatar_url = avatar_url;

    if (Object.keys(serverUpdates).length === 0) return payload;
    const user = await usersApi.updateProfile(serverUpdates);
    return { ...payload, ...user };
  },
);

export const signOut = createAsyncThunk(
  "auth/signOut",
  async (_: void, { dispatch }) => {
    authApi.signOut();
    dispatch(logout());
  },
);

// ---------------------------------------------------------------------------
// Slice — login/logout/setHydrated are plain synchronous actions, matching
// how app/_layout.tsx already dispatches them.
// ---------------------------------------------------------------------------

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login(state, action: PayloadAction<{ user: UserDto; token: string }>) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.status = "idle";
      state.error = null;
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.status = "idle";
    },
    setHydrated(state, action: PayloadAction<boolean>) {
      state.hydrated = action.payload;
    },
    setTutorialSeen(state, action: PayloadAction<boolean>) {
      if (state.user) state.user.tutorial_seen = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signIn.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.status = "error";
        state.error = action.error.message ?? "Login failed";
      })
      .addCase(signUp.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(signUp.rejected, (state, action) => {
        state.status = "error";
        state.error = action.error.message ?? "Registration failed";
      })
      .addCase(googleSignIn.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(googleSignIn.rejected, (state, action) => {
        state.status = "error";
        state.error = action.error.message ?? "Google sign-in failed";
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchMe.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        if (state.user)
          state.user = {
            ...state.user,
            ...(action.payload as Partial<UserDto>),
          };
      });
  },
});

export const { login, logout, setHydrated, setTutorialSeen } =
  authSlice.actions;
export default authSlice.reducer;
