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
  return response.json();
};

export const trainingService = {
  async login(email: string, password: string) {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    return response.json();
  },

  async register(full_name: string, email: string, password: string) {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name, email, password })
    });
    return response.json();
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

  async startTraining(datasetId: string, modelName: string, modelType: "static"|"dynamic") {
    modelName = modelName.toUpperCase();
    return fetchWithAuth("/train/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataset_id: datasetId, model_name: modelName, model_type: modelType })
    });
  },

  async getTrainingStatus(jobId: string) {
    return fetchWithAuth(`/train/status/${jobId}`);
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
    return fetchWithAuth(`/collect/datasets/${datasetId}/labels/${label}`, { method: "DELETE" });
  },

  async renameLabel(datasetId: string, oldLabel: string, newLabel: string) {
    return fetchWithAuth(`/collect/datasets/${datasetId}/labels/${oldLabel}`, {
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
  }
};
