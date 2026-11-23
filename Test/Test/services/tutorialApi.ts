import { api } from "./api";
import type { UserDto } from "./authApi";

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
  stats: () => api.get<UserDto>("/users/me/stats"),
  updateProfile: (payload: ProfileUpdateInput) => api.patch<UserDto>("/users/me", payload),
  completeTutorial: () => api.post<UserDto>("/users/me/tutorial-complete"),
};
