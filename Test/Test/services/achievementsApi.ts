import { api } from "./api";

export interface AchievementDto {
  id: number;
  code: string;
  title: string;
  description: string;
  icon: string;
  experience: number;
  completed: boolean;
  completed_at: string | null;
}

export const achievementsApi = {
  list: () => api.get<AchievementDto[]>("/achievements/"),
};
