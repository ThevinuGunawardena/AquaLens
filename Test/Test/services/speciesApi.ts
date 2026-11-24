import { api, resolveAssetUrl } from "./api";

export interface SpeciesDto {
  id: number;
  name: string;
  scientific_name: string;
  category: string;
  image: string | null;
  description: string | null;
  habitat: string | null;
  average_size_cm: number | null;
}

function normalizeSpecies(species: SpeciesDto): SpeciesDto {
  return {
    ...species,
    image: resolveAssetUrl(species.image),
  };
}

export const speciesApi = {
  // GET /species is public (no require_auth in the router), so don't send
  // a token that might not exist yet on the dictionary screen.
  list: async (q?: string) => {
    const items = await api.get<SpeciesDto[]>(
      `/species/${q ? `?q=${encodeURIComponent(q)}` : ""}`,
      { auth: false },
    );
    return items.map(normalizeSpecies);
  },

  get: async (id: number | string) =>
    normalizeSpecies(await api.get<SpeciesDto>(`/species/${id}`, { auth: false })),
};
