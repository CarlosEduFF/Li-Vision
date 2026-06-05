export interface RankingEntry {
  name: string;
  samples: number;
  position?: number;
}

export interface RankingResponse {
  ok: boolean;
  ranking: RankingEntry[];
}
