import { api } from "./api";
import { normalizeUser, type UserDto } from "./authApi";

export interface TutorialStep {
  step: number;
  title: string;
  description: string;
}

export interface Tutorial {
  id: string;
  title: string;
  steps: TutorialStep[];
}

export const tutorialApi = {
  getUploadPhotoTutorial: () => api.get<Tutorial>("/tutorial/upload-photo", { auth: false }),
  getStatus: () => api.get<{ tutorial_seen: boolean }>("/tutorial/status"),
};

export interface ProfileUpdateInput {
  name?: string;
  avatar_url?: string;
}

export const usersApi = {
  stats: async () => normalizeUser(await api.get<UserDto>("/users/me/stats")),
  updateProfile: async (payload: ProfileUpdateInput) =>
    normalizeUser(await api.patch<UserDto>("/users/me", payload)),
  completeTutorial: async () =>
    normalizeUser(await api.post<UserDto>("/users/me/tutorial-complete")),
};
