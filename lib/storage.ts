import AsyncStorage from "@react-native-async-storage/async-storage";

export type UserSession = {
  token: string;
  refreshToken: string;
  userId: string;
  role: string;
  name: string;
  avatarUrl?: string;
};

export const UserStorage = {
  async saveSession(session: UserSession): Promise<void> {
    const pairs: [string, string][] = [
      ["userToken", session.token],
      ["refreshToken", session.refreshToken],
      ["userId", session.userId],
      ["userRole", session.role],
      ["userName", session.name],
    ];
    if (session.avatarUrl) pairs.push(["userAvatar", session.avatarUrl]);
    await AsyncStorage.multiSet(pairs);
  },

  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem("userToken");
  },

  async getRefreshToken(): Promise<string | null> {
    return AsyncStorage.getItem("refreshToken");
  },

  async getSession(): Promise<Partial<UserSession>> {
    const keys = ["userToken", "refreshToken", "userId", "userRole", "userName", "userAvatar"] as const;
    const pairs = await AsyncStorage.multiGet([...keys]);
    const map = Object.fromEntries(pairs.map(([k, v]) => [k, v ?? undefined]));
    return {
      token: map.userToken,
      refreshToken: map.refreshToken,
      userId: map.userId,
      role: map.userRole,
      name: map.userName,
      avatarUrl: map.userAvatar,
    };
  },

  async updateProfile(fields: { name?: string; avatarUrl?: string }): Promise<void> {
    const pairs: [string, string][] = [];
    if (fields.name !== undefined) pairs.push(["userName", fields.name]);
    if (fields.avatarUrl !== undefined) pairs.push(["userAvatar", fields.avatarUrl]);
    if (pairs.length > 0) await AsyncStorage.multiSet(pairs);
  },

  async clear(): Promise<void> {
    await AsyncStorage.multiRemove(["userToken", "refreshToken", "userId", "userRole", "userName", "userAvatar", "activeModelName"]);
  },
};
