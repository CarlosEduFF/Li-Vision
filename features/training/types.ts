export interface Dataset {
  id: string;
  name: string;
  labels?: string[];
  created_at?: string;
}

export interface DatasetStats {
  total_samples: number;
  labels: Record<string, number>;
}

export interface TrainingJob {
  job_id: string;
  status: string;
  model_name?: string;
  error?: string;
}

export interface TrainingStatus {
  ok: boolean;
  status: string;
  progress?: number;
  error?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  is_active: boolean;
  created_at?: string;
}

export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
}
