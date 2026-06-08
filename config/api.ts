/**
 * Fonte única da URL da API. Troque aqui (ou via EXPO_PUBLIC_API_URL) e todo o
 * app — REST e WebSocket — passa a apontar para o novo host.
 */
export const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ??
  "https://li-visionv3.onrender.com";

/**
 * URL base do WebSocket, derivada de API_BASE_URL.
 * https → wss, http → ws. Endpoints específicos são montados em cima desta
 * (ex.: `${WS_BASE_URL}/ws/detect`).
 */
export const WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");

/** Monta uma URL REST a partir de um path (com ou sem `/` inicial). */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}/${path.replace(/^\//, "")}`;
}

/** Monta uma URL de WebSocket a partir de um path. */
export function wsUrl(path: string): string {
  return `${WS_BASE_URL}/${path.replace(/^\//, "")}`;
}
