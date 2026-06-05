import { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { profileService } from "./profileService";
import { rankingService } from "@/features/ranking/rankingService";
import type { RankingEntry } from "@/features/ranking/types";

const TOP_RANKING_COUNT = 5;

export type ProfileData = {
  fullName: string;
  avatarUrl: string | null;
  activeModelName: string | null;
  ranking: RankingEntry[];
  isLoading: boolean;
};

export function useProfile(): ProfileData & { refresh: () => Promise<void> } {
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [activeModelName, setActiveModelName] = useState<string | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [name, avatar, model] = await Promise.all([
        AsyncStorage.getItem("userName"),
        AsyncStorage.getItem("userAvatar"),
        AsyncStorage.getItem("activeModelName"),
      ]);
      if (name) setFullName(name);
      if (avatar) setAvatarUrl(avatar);
      if (model) setActiveModelName(model);

      const [profileRes, rankRes] = await Promise.all([
        profileService.getProfile(),
        rankingService.getRanking(),
      ]);

      if (profileRes.ok && profileRes.profile) {
        setFullName(profileRes.profile.full_name || "");
        setAvatarUrl(profileRes.profile.avatar_url ?? null);
      }

      if (rankRes?.ranking) {
        setRanking(rankRes.ranking.slice(0, TOP_RANKING_COUNT));
      }
    } catch (e) {
      console.log("Erro ao carregar dados do perfil:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { fullName, avatarUrl, activeModelName, ranking, isLoading, refresh };
}
