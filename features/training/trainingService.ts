import { apiRequest } from "@/lib/http";
import type { TrainingJob, TrainingStatus, ModelInfo } from "./types";

export const trainingService = {
  async startTraining(
    datasetIds: string[],
    modelName: string
  ): Promise<any> {
    return apiRequest("/train/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataset_ids: datasetIds,
        model_name: modelName.toUpperCase(),
      }),
    });
  },

  async getTrainingStatus(jobId: string): Promise<any> {
    return apiRequest(`/train/status/${jobId}`);
  },

  async getTrainingStatusByModel(modelName: string): Promise<any> {
    return apiRequest(`/train/status/by-model/${encodeURIComponent(modelName)}`);
  },

  async listModels(): Promise<any> {
    return apiRequest("/train/models");
  },

  async activateModel(modelId: string): Promise<any> {
    return apiRequest("/train/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model_id: modelId }),
    });
  },
};
