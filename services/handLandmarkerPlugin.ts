/**
 * Bridge TypeScript para o plugin nativo HandLandmarker.
 *
 * Usa o MediaPipe Tasks SDK no Android via Frame Processor Plugin
 * do VisionCamera para detectar os 21 landmarks da mão localmente.
 *
 * Retorna coordenadas normalizadas [0, 1] para cada ponto.
 */

import { VisionCameraProxy, Frame } from "react-native-vision-camera";

// ── Estado do plugin ──────────────────────────────────
let plugin: ReturnType<typeof VisionCameraProxy.initFrameProcessorPlugin> | null = null;
let pluginError: string | null = null;

try {
  plugin = VisionCameraProxy.initFrameProcessorPlugin("handLandmarker", {});
  if (!plugin) {
    pluginError = "Plugin 'handLandmarker' retornou null. Verifique se o build nativo inclui o HandLandmarkerPlugin.";
  }
} catch (e: any) {
  pluginError = e.message || "Erro desconhecido ao inicializar o plugin HandLandmarker.";
}

/** Um ponto 3D normalizado [0, 1] */
export type LandmarkPoint = {
  x: number;
  y: number;
  z: number;
};

/** Resultado da detecção de mão */
export type HandLandmarkResult = {
  /** Array de mãos, cada mão com 21 LandmarkPoints */
  hands: LandmarkPoint[][];
};

/**
 * Retorna o estado atual do plugin nativo.
 * Seguro para chamar a qualquer momento no thread JS.
 * NÃO é um worklet — use apenas na UI.
 */
export function getPluginStatus(): { ready: boolean; error: string | null } {
  return {
    ready: plugin !== null && pluginError === null,
    error: pluginError,
  };
}

/**
 * Executa a detecção de landmarks da mão no frame da câmera.
 *
 * DEVE ser chamado dentro de um useFrameProcessor (worklet).
 *
 * @param frame - Frame da câmera do VisionCamera
 * @returns Resultado com os landmarks ou null se o plugin não carregou
 */
export function detectHandLandmarks(frame: Frame): HandLandmarkResult | null {
  "worklet";

  if (plugin == null) {
    // Retorna null silenciosamente em vez de lançar exceção.
    // O código JS pode verificar via getPluginStatus().
    return null;
  }

  const result = plugin.call(frame) as unknown as HandLandmarkResult | null;
  return result;
}
