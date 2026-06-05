import { apiRequest, apiRequestRaw } from "@/lib/http";
import { UserStorage } from "@/lib/storage";
import type { ProfileResponse, AvatarUploadResponse } from "./types";

export const profileService = {
  async getProfile(): Promise<ProfileResponse> {
    return apiRequest<ProfileResponse>("/auth/profile");
  },

  async updateProfile(full_name: string): Promise<any> {
    return apiRequest("/auth/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name }),
    });
  },

  async uploadAvatar(imageUri: string): Promise<AvatarUploadResponse> {
    const form = new FormData();
    form.append("file", {
      uri: imageUri,
      name: "avatar.jpg",
      type: "image/jpeg",
    } as unknown as Blob);

    try {
      const response = await apiRequestRaw("/auth/profile/upload-avatar", {
        method: "POST",
        body: form,
      });
      const data: AvatarUploadResponse = await response.json();
      if (!response.ok) {
        data.ok = false;
        if (!data.detail && !data.error) {
          data.detail = `Erro do Servidor (${response.status})`;
        }
      }
      return data;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, detail: "Erro de conexão: " + msg };
    }
  },

  async syncToStorage(profile: { full_name?: string; avatar_url?: string | null }): Promise<void> {
    await UserStorage.updateProfile({
      name: profile.full_name,
      avatarUrl: profile.avatar_url ?? undefined,
    });
  },
};
