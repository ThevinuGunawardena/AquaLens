import { File as ExpoFile } from "expo-file-system";
import { Platform } from "react-native";

import { api, resolveAssetUrl } from "./api";

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

/**
 * Converts an image path returned by the backend into a full URL.
 */
export const getImageUrl = resolveAssetUrl;

function extensionFromMimeType(mimeType?: string | null): string | null {
  if (!mimeType) return null;
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  return null;
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

export interface UploadImageMetadata {
  fileName?: string | null;
  mimeType?: string | null;
}

export const catchesApi = {
  /**
   * Uploads a local photo and returns the hosted URL.
   */
  async uploadImage(
    localUri: string,
    meta?: UploadImageMetadata,
  ): Promise<string> {
    const uriTail = localUri.startsWith("data:")
      ? ""
      : localUri.split("/").pop()?.split("?")[0] || "";
    const rawName = meta?.fileName?.trim() || uriTail;
    const hasExt = /\.(jpg|jpeg|png|webp)$/i.test(rawName);
    const fallbackExt = extensionFromMimeType(meta?.mimeType) ?? "jpg";
    const filename = hasExt ? rawName : `catch-${Date.now()}.${fallbackExt}`;

    const form = new FormData();

    if (Platform.OS === "web") {
      const res = await fetch(localUri);
      if (!res.ok) {
        throw new Error(`Could not read selected image (${res.status}).`);
      }
      const blob = await res.blob();
      const webFilename = hasExt
        ? filename
        : `catch-${Date.now()}.${extensionFromMimeType(blob.type) ?? fallbackExt}`;
      form.append("file", blob, webFilename);
    } else {
      // Expo SDK 57 installs WinterCG `expo/fetch`, which rejects legacy RN
      // `{ uri, name, type }` objects with "Unsupported FormDataPart implementation"
      // and expects either a `Blob` or a file-like part exposing `.bytes()`.
      const nativeFile = new ExpoFile(localUri);
      const resolvedMime =
        meta?.mimeType || nativeFile.type || guessMimeType(filename);
      form.append("file", {
        name: filename,
        type: resolvedMime,
        bytes: () => nativeFile.bytes(),
      } as unknown as Blob);
    }

    const data = await api.post<{ url: string }>(
      "/catches/upload-image",
      form,
      {
        bodyType: "multipart",
        timeoutMs: 30_000,
      },
    );

    const imageUrl = getImageUrl(data.url);
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
