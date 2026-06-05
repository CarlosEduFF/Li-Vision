import { apiRequest } from "@/lib/http";
import { UserStorage } from "@/lib/storage";
import type { LoginResponse, RegisterResponse } from "./types";

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const data = await apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    await UserStorage.saveSession({
      token: data.token,
      refreshToken: data.refresh_token,
      userId: String(data.user_id),
      role: String(data.role),
      name: data.full_name,
      avatarUrl: data.avatar_url,
    });
    return data;
  },

  async register(full_name: string, email: string, password: string): Promise<RegisterResponse> {
    const data = await apiRequest<RegisterResponse>("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name, email, password }),
    });
    await UserStorage.saveSession({
      token: data.token,
      refreshToken: data.refresh_token,
      userId: String(data.user_id),
      role: String(data.role),
      name: data.full_name,
    });
    return data;
  },
};
