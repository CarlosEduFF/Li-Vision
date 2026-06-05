import { API_BASE_URL } from "@/config/api";
import { apiRequest, apiRequestRaw } from "@/lib/http";

export type LearningLevelApi = "iniciante" | "intermediario" | "avancado";

export interface LearningGestureApi {
  id: string;
  name: string;
  level: LearningLevelApi;
  category: string;
  module: string;
  description: string;
  svg_initial?: string;
  svg_movement?: string;
  svg_final?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LearningGesturePayloadApi {
  name: string;
  level: LearningLevelApi;
  category: string;
  module: string;
  description: string;
  svg_initial?: string;
  svg_movement?: string;
  svg_final?: string;
  is_active?: boolean;
}

export async function detectGesture(uri: string) {
  const form = new FormData();
  form.append("file", { uri, name: "frame.jpg", type: "image/jpeg" } as unknown as Blob);
  const response = await fetch(`${API_BASE_URL}/detect/`, {
    method: "POST",
    body: form,
  });
  return response.json();
}

export async function setRunMode(mode: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/mode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ run_mode: mode }),
  });
  if (!response.ok) throw new Error("Erro ao setar run mode");
}

export async function setDetectionMode(mode: string): Promise<void> {
  await fetch(`${API_BASE_URL}/admin/detection`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
}

export async function getState(): Promise<unknown> {
  const response = await fetch(`${API_BASE_URL}/admin/state`);
  return response.json();
}

export async function getLearningGestures(params?: {
  level?: LearningLevelApi;
  category?: string;
  module?: string;
  include_inactive?: boolean;
}): Promise<{ ok: boolean; items: LearningGestureApi[] }> {
  const query = new URLSearchParams();
  if (params?.level) query.append("level", params.level);
  if (params?.category) query.append("category", params.category);
  if (params?.module) query.append("module", params.module);
  if (typeof params?.include_inactive === "boolean") {
    query.append("include_inactive", String(params.include_inactive));
  }
  const qs = query.toString();
  return apiRequest(`/learning/gestures${qs ? `?${qs}` : ""}`);
}

export async function createLearningGesture(
  payload: LearningGesturePayloadApi
): Promise<{ ok: boolean; item: LearningGestureApi }> {
  return apiRequest("/learning/gestures", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateLearningGesture(
  gestureId: string,
  payload: LearningGesturePayloadApi
): Promise<{ ok: boolean; item: LearningGestureApi }> {
  return apiRequest(`/learning/gestures/${gestureId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteLearningGesture(
  gestureId: string
): Promise<{ ok: boolean; deleted: number }> {
  return apiRequest(`/learning/gestures/${gestureId}`, { method: "DELETE" });
}

export async function uploadLearningImage(uri: string): Promise<{ ok: boolean; url: string }> {
  const form = new FormData();
  form.append("file", { uri, name: "image.jpg", type: "image/jpeg" } as unknown as Blob);
  const response = await apiRequestRaw("/learning/gestures/upload-image", {
    method: "POST",
    body: form,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.detail || "Erro ao fazer upload da imagem");
  return data as { ok: boolean; url: string };
}
