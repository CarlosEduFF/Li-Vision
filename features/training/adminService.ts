import { apiRequest } from "@/lib/http";

export const adminService = {
  async exportSamples(): Promise<any> {
    return apiRequest("/admin/export-samples");
  },

  async importSamples(payload: unknown): Promise<any> {
    return apiRequest("/admin/import-samples", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  async getRulesEnabled(): Promise<boolean | undefined> {
    try {
      const res = await apiRequest<{ rules_enabled?: boolean }>("/admin/state");
      return res.rules_enabled;
    } catch (e) {
      console.log("Erro ao carregar rules_enabled do servidor:", e);
      return undefined;
    }
  },

  async setRulesEnabled(enabled: boolean): Promise<any> {
    return apiRequest("/admin/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
  },
};
