const BASE_URL = "https://li-visionv2.onrender.com";

async function getAuthToken(): Promise<string | null> {
  try {
    const { default: AsyncStorage } = await import("@react-native-async-storage/async-storage");
    return await AsyncStorage.getItem("userToken");
  } catch (e) {
    console.log("Erro ao recuperar token:", e);
    return null;
  }
}

async function authHeaders(extra: Record<string, string> = {}) {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export async function detectGesture(uri: string) {
  const form = new FormData();

  form.append("file", {
    uri,
    name: "frame.jpg",
    type: "image/jpeg",
  } as any);

  const response = await fetch(`${BASE_URL}/detect/`, {
    method: "POST",
    body: form,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.json();
}

export async function setRunMode(mode: string) {
  const response = await fetch(`${BASE_URL}/admin/mode`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      run_mode: mode,
    }),
  });

  const data = await response.text();

  console.log("SET RUN MODE STATUS:", response.status);
  console.log("SET RUN MODE RESPONSE:", data);

  if (!response.ok) {
    throw new Error("Erro ao setar run mode");
  }
}

export async function setDetectionMode(mode: string) {
  await fetch(`${BASE_URL}/admin/detection`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode: mode,
    }),
  });
}

export async function getState() {
  const response = await fetch(`${BASE_URL}/admin/state`);
  return response.json();
}

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

export async function getLearningGestures(params?: {
  level?: LearningLevelApi;
  category?: string;
  module?: string;
  include_inactive?: boolean;
}) {
  const query = new URLSearchParams();
  if (params?.level) query.append("level", params.level);
  if (params?.category) query.append("category", params.category);
  if (params?.module) query.append("module", params.module);
  if (typeof params?.include_inactive === "boolean") {
    query.append("include_inactive", String(params.include_inactive));
  }

  const url = `${BASE_URL}/learning/gestures${query.toString() ? `?${query.toString()}` : ""}`;
  const response = await fetch(url, {
    method: "GET",
    headers: await authHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.detail || "Erro ao buscar gestos de aprendizagem");
  }
  return data as { ok: boolean; items: LearningGestureApi[] };
}

export async function createLearningGesture(payload: LearningGesturePayloadApi) {
  const response = await fetch(`${BASE_URL}/learning/gestures`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.detail || "Erro ao criar gesto");
  }
  return data as { ok: boolean; item: LearningGestureApi };
}

export async function updateLearningGesture(
  gestureId: string,
  payload: LearningGesturePayloadApi
) {
  const response = await fetch(`${BASE_URL}/learning/gestures/${gestureId}`, {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.detail || "Erro ao atualizar gesto");
  }
  return data as { ok: boolean; item: LearningGestureApi };
}

export async function deleteLearningGesture(gestureId: string) {
  const response = await fetch(`${BASE_URL}/learning/gestures/${gestureId}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.detail || "Erro ao excluir gesto");
  }
  return data as { ok: boolean; deleted: number };
}

export async function uploadLearningImage(uri: string) {
  const form = new FormData();
  form.append("file", {
    uri,
    name: "image.jpg",
    type: "image/jpeg",
  } as any);

  const token = await getAuthToken();
  const headers: Record<string, string> = {
    // We let fetch handle the multipart/form-data boundary
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}/learning/gestures/upload-image`, {
    method: "POST",
    headers,
    body: form,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.detail || "Erro ao fazer upload da imagem");
  }
  return data as { ok: boolean; url: string };
}
