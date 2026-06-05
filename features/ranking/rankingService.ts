import { apiRequest } from "@/lib/http";
import type { RankingResponse } from "./types";

export const rankingService = {
  async getRanking(): Promise<RankingResponse> {
    return apiRequest<RankingResponse>("/collect/ranking");
  },
};
