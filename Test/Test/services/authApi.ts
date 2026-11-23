import { api, setAuthToken } from "./api";

export interface UserDto {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  is_active?: boolean;
  tutorial_seen: boolean;
  has_password?: boolean;
  xp: number;
  level: number;
  school_or_university?: string | null;
  district?: string | null;
  // level_progress() may add more fields (e.g. xp_to_next_level) — kept
  // open-ended so the UI can read whatever util.gamification returns.
  [key: string]: unknown;
}

interface SessionDto {
  user: UserDto;
  access_token: string;
  token_type: string;
}

export interface AuthResult {
  user: UserDto;
  token: string;
}

export const authApi = {
  async register(
    name: string,
    email: string,
    password: string,
  ): Promise<AuthResult> {
    const data = await api.post<SessionDto>(
      "/auth/register",
      { name, email, password },
      { auth: false },
    );
    setAuthToken(data.access_token);
    return { user: data.user, token: data.access_token };
  },

  async login(email: string, password: string): Promise<AuthResult> {
    // POST /auth/login takes fastapi's OAuth2PasswordRequestForm, which is
    // application/x-www-form-urlencoded with a "username" field — not JSON.
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);

    const data = await api.post<SessionDto>("/auth/login", form.toString(), {
      bodyType: "urlencoded",
      auth: false,
    });
    setAuthToken(data.access_token);
    return { user: data.user, token: data.access_token };
  },

  async google(idToken: string): Promise<AuthResult> {
    const data = await api.post<SessionDto>(
      "/auth/google",
      { id_token: idToken },
      { auth: false },
    );
    setAuthToken(data.access_token);
    return { user: data.user, token: data.access_token };
  },

  me: () => api.get<UserDto>("/auth/me"),

  signOut() {
    setAuthToken(null);
  },
};
