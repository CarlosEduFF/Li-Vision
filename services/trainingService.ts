import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "https://li-visionv2.onrender.com";

const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  const token = await AsyncStorage.getItem("userToken");
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });
  const data = await response.json();
  if (!response.ok && data.detail && !data.error) {
    data.error = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
    data.ok = false;
  }
  return data;
};

export const trainingService = {
  async login(email: string, password: string) {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (data.ok && data.token && data.refresh_token) {
      await AsyncStorage.setItem("userToken", data.token);
      await AsyncStorage.setItem("refreshToken", data.refresh_token);
    }
    return data;
  },

  async register(full_name: string, email: string, password: string) {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name, email, password })
    });
    const data = await response.json();
    if (data.ok && data.token && data.refresh_token) {
      await AsyncStorage.setItem("userToken", data.token);
      await AsyncStorage.setItem("refreshToken", data.refresh_token);
    }
    return data;
  },

  async getDatasets() {
    return fetchWithAuth("/collect/datasets");
  },

  async startStaticCollection(label: string, dataset_name: string, landmarks: any) {
    label = label.toUpperCase();
    dataset_name = dataset_name.toUpperCase();
    return fetchWithAuth("/collect/static", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, dataset_name, landmarks })
    });
  },

  async startDynamicCollection(label: string, dataset_name: string) {
    label = label.toUpperCase();
    dataset_name = dataset_name.toUpperCase();
    return fetchWithAuth("/collect/dynamic/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, dataset_name })
    });
  },

  async stopDynamicCollection() {
    return fetchWithAuth("/collect/dynamic/stop", { method: "POST" });
  },

  async startTraining(datasetIds: string[], modelName: string) {
    modelName = modelName.toUpperCase();
    return fetchWithAuth("/train/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataset_ids: datasetIds, model_name: modelName })
    });
  },

  async getTrainingStatus(jobId: string) {
    return fetchWithAuth(`/train/status/${jobId}`);
  },

  async getTrainingStatusByModel(modelName: string) {
    return fetchWithAuth(`/train/status/by-model/${encodeURIComponent(modelName)}`);
  },

  async getDatasetStats(datasetId: string) {
    return fetchWithAuth(`/collect/datasets/${datasetId}/stats`);
  },

  async deleteDataset(datasetId: string) {
    return fetchWithAuth(`/collect/datasets/${datasetId}`, { method: "DELETE" });
  },

  async renameDataset(datasetId: string, newName: string) {
    return fetchWithAuth(`/collect/datasets/${datasetId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_name: newName })
    });
  },

  async deleteLabel(datasetId: string, label: string) {
    return fetchWithAuth(`/collect/datasets/${datasetId}/labels/${encodeURIComponent(label)}`, { method: "DELETE" });
  },

  async renameLabel(datasetId: string, oldLabel: string, newLabel: string) {
    return fetchWithAuth(`/collect/datasets/${datasetId}/labels/${encodeURIComponent(oldLabel)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_label: newLabel })
    });
  },

  async listModels() {
    return fetchWithAuth("/train/models");
  },

  async activateModel(modelId: string) {
    return fetchWithAuth("/train/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model_id: modelId })
    });
  },

  async getRanking() {
    return fetchWithAuth("/collect/ranking");
  },

  async getProfile() {
    return fetchWithAuth("/auth/profile");
  },

  async updateProfile(full_name: string) {
    return fetchWithAuth("/auth/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name })
    });
  },

  async uploadAvatar(imageUri: string) {
    const token = await AsyncStorage.getItem("userToken");
    const form = new FormData();
    form.append("file", {
      uri: imageUri,
      name: "avatar.jpg",
      type: "image/jpeg"
    } as any);

    try {
      const response = await fetch(`${API_URL}/auth/profile/upload-avatar`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: form,
      });
      
      const data = await response.json();
      if (!response.ok) {
        data.ok = false;
        if (!data.detail && !data.error) {
          data.detail = `Erro do Servidor (${response.status})`;
        }
      }
      return data;
    } catch (e: any) {
      return { ok: false, detail: "Erro de conexão: " + e.message };
    }
  },

  async exportSamples() {
    return fetchWithAuth("/admin/export-samples");
  },

  async importSamples(payload: any) {
    return fetchWithAuth("/admin/import-samples", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }
};
