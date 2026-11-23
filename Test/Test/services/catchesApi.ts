import { Platform } from "react-native";

import { api } from "./api";

export interface CatchDto {
  id: number;
  owner_id: number;
  species_id: number;
  species_name: string | null;
  length_cm: number;
  remarks: string | null;
  boat_number: string | null;
  image: string | null;
  xp_awarded: number;
  created_at: string | null;
}

export interface AddCatchInput {
  species_id: number;
  length_cm: number;
  width_cm?: number;
  remarks?: string;
  boat_number?: string;
  image?: string;
}

export interface AddCatchResult {
  catch: CatchDto;
  xp_awarded: number;
  newly_unlocked_achievements: unknown[];
  progress: Record<string, unknown>;
}

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://aquaquest.msdfar.com";

/**
 * Converts an image path returned by the backend into a full URL.
 */
export function getImageUrl(image: string | null): string | null {
  if (!image) {
    return null;
  }

  // Already a complete URL
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  // Root-relative path (/static/...)
  if (image.startsWith("/")) {
    return `${BASE_URL}${image}`;
  }

  // Domain without protocol (e.g. aquaquest.msdfar.com/static/...)
  if (image.includes("/")) {
    return `http://${image}`;
  }

  return `${BASE_URL}/${image}`;
}

function guessMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (ext === "png") {
    return "image/png";
  }

  if (ext === "webp") {
    return "image/webp";
  }

  return "image/jpeg";
}

export const catchesApi = {
  /**
   * Uploads a local photo and returns the hosted URL.
   */
  async uploadImage(localUri: string): Promise<string> {
    console.log("UPLOAD IMAGE - Local URI:", localUri);

    const rawName = localUri.split("/").pop()?.split("?")[0] || "";

    const hasExt = /\.(jpg|jpeg|png|webp)$/i.test(rawName);

    const filename = hasExt ? rawName : `catch-${Date.now()}.jpg`;

    console.log("UPLOAD IMAGE - Filename:", filename);

    const form = new FormData();

    if (Platform.OS === "web") {
      console.log("UPLOAD IMAGE - Platform: Web");

      const res = await fetch(localUri);

      console.log("UPLOAD IMAGE - Fetch status:", res.status);

      const blob = await res.blob();

      console.log("UPLOAD IMAGE - Blob:", blob);

      form.append("file", blob, filename);
    } else {
      console.log("UPLOAD IMAGE - Platform:", Platform.OS);

      form.append("file", {
        uri: localUri,
        name: filename,
        type: guessMimeType(filename),
      } as any);
    }

    const data = await api.post<{ url: string }>(
      "/catches/upload-image",
      form,
      {
        bodyType: "multipart",
      },
    );

    console.log("UPLOAD IMAGE RESPONSE:", data);

    // Also make sure uploaded URL is complete
    const imageUrl = getImageUrl(data.url);

    console.log("UPLOAD IMAGE FULL URL:", imageUrl);

    return imageUrl ?? data.url;
  },

  /**
   * Add a new catch.
   */
  async add(input: AddCatchInput): Promise<AddCatchResult> {
    console.log("ADD CATCH - Request:", input);

    const response = await api.post<AddCatchResult>("/catches/", input);

    console.log("ADD CATCH RESPONSE:", response);

    // Make sure the returned catch image is a full URL
    if (response.catch?.image) {
      response.catch.image = getImageUrl(response.catch.image);
    }

    console.log("ADD CATCH IMAGE URL:", response.catch?.image);

    return response;
  },

  /**
   * Get user's catches.
   */
  async mine(limit = 50, offset = 0): Promise<CatchDto[]> {
    console.log("MINE CATCHES - Request:", {
      limit,
      offset,
    });

    const response = await api.get<CatchDto[]>(
      `/catches/mine?limit=${limit}&offset=${offset}`,
    );

    console.log("MINE CATCHES RESPONSE:", response);

    // Convert every image path to a full URL
    const catches = response.map((item) => ({
      ...item,
      image: getImageUrl(item.image),
    }));

    console.log("MINE CATCHES WITH FULL IMAGE URL:", catches);

    return catches;
  },

  /**
   * Same endpoint, but keeps the total count.
   */
  async mineWithTotal(limit = 50, offset = 0) {
    console.log("MINE WITH TOTAL - Request:", {
      limit,
      offset,
    });

    const response = await api.get<{
      data: CatchDto[];
      total: number;
      limit: number;
      offset: number;
    }>(`/catches/mine?limit=${limit}&offset=${offset}`, {
      raw: true,
    });

    console.log("MINE WITH TOTAL RESPONSE:", response);

    const data = response.data.map((item) => ({
      ...item,
      image: getImageUrl(item.image),
    }));

    const result = {
      ...response,
      data,
    };

    console.log("MINE WITH TOTAL FULL IMAGE URL:", result);

    return result;
  },

  /**
   * Get a single catch by ID.
   */
  async get(id: number): Promise<CatchDto> {
    console.log("GET CATCH - ID:", id);

    const response = await api.get<CatchDto>(`/catches/${id}`);

    console.log("GET CATCH RESPONSE:", response);

    const result = {
      ...response,
      image: getImageUrl(response.image),
    };

    console.log("GET CATCH FULL IMAGE URL:", result.image);

    return result;
  },

  /**
   * Delete a catch.
   */
  async remove(id: number): Promise<{ id: number }> {
    console.log("DELETE CATCH - ID:", id);

    const response = await api.delete<{ id: number }>(`/catches/${id}`);

    console.log("DELETE CATCH RESPONSE:", response);

    return response;
  },
};
