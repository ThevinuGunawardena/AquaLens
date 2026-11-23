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
  eligibility: () =>
    api.get<CertificateEligibilityDto>("/certificate/eligibility"),
  achievers: () =>
    api.get<AchieverDto[]>("/certificate/achievers"),
};

