import { api } from "./api";

export interface CertificateEligibilityDto {
  eligible: boolean;
  required_catches: number;
  total_catches: number;
}

export interface AchieverDto {
  user_id: number;
  name: string;
  email: string;
  total_catches: number;
}

export const certificateApi = {
  eligibility: async (): Promise<CertificateEligibilityDto> => {
    try {
      return await api.get<CertificateEligibilityDto>("/certificate/eligibility");
    } catch {
      // Fallback: calculate milestone from user's actual catch count
      try {
        const result = await api.get<{ total?: number; data?: unknown[] }>(
          "/catches/mine?limit=1&offset=0",
          { raw: true },
        );
        const total =
          typeof result?.total === "number"
            ? result.total
            : Array.isArray(result?.data)
              ? result.data.length
              : 0;
        return {
          eligible: total >= 100,
          required_catches: 100,
          total_catches: total,
        };
      } catch {
        return {
          eligible: false,
          required_catches: 100,
          total_catches: 0,
        };
      }
    }
  },

  achievers: async (): Promise<AchieverDto[]> => {
    try {
      return await api.get<AchieverDto[]>("/certificate/achievers");
    } catch {
      return [];
    }
  },
};
