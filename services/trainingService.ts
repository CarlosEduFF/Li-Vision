const API_URL = "https://li-visionv2.onrender.com";

export const trainingService = {
  async getDatasets() {
    const response = await fetch(`${API_URL}/collect/datasets`);
    return response.json();
  },

  async startStaticCollection(label: string, dataset_name: string, landmarks: any) {
    label = label.toUpperCase();
    dataset_name = dataset_name.toUpperCase();
    const payload = {
      label,
      dataset_name,
      landmarks
    };
    
    const response = await fetch(`${API_URL}/collect/static`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  async startDynamicCollection(label: string, dataset_name: string) {
    label = label.toUpperCase();
    dataset_name = dataset_name.toUpperCase();
    const payload = { label, dataset_name };
    const response = await fetch(`${API_URL}/collect/dynamic/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  async stopDynamicCollection() {
    const response = await fetch(`${API_URL}/collect/dynamic/stop`, {
      method: "POST"
    });
    return response.json();
  },

  async startTraining(datasetId: string, modelName: string, modelType: "static"|"dynamic") {
    modelName = modelName.toUpperCase();
    const payload = {
      dataset_id: datasetId,
      model_name: modelName,
      model_type: modelType
    };
    const response = await fetch(`${API_URL}/train/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  async getTrainingStatus(jobId: string) {
    const response = await fetch(`${API_URL}/train/status/${jobId}`);
    return response.json();
  },

  async getDatasetStats(datasetId: string) {
    const response = await fetch(`${API_URL}/collect/datasets/${datasetId}/stats`);
    return response.json();
  },

  async deleteDataset(datasetId: string) {
    const response = await fetch(`${API_URL}/collect/datasets/${datasetId}`, {
      method: "DELETE"
    });
    return response.json();
  },

  async renameDataset(datasetId: string, newName: string) {
    const response = await fetch(`${API_URL}/collect/datasets/${datasetId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_name: newName })
    });
    return response.json();
  },

  async deleteLabel(datasetId: string, label: string) {
    const response = await fetch(`${API_URL}/collect/datasets/${datasetId}/labels/${label}`, {
      method: "DELETE"
    });
    return response.json();
  },

  async renameLabel(datasetId: string, oldLabel: string, newLabel: string) {
    const response = await fetch(`${API_URL}/collect/datasets/${datasetId}/labels/${oldLabel}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_label: newLabel })
    });
    return response.json();
  },

  async listModels() {
    const response = await fetch(`${API_URL}/train/models`);
    return response.json();
  },

  async activateModel(modelId: string) {
    const payload = { model_id: modelId };
    const response = await fetch(`${API_URL}/train/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return response.json();
  }
};
