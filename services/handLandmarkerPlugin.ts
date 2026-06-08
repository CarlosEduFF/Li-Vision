/**
 * Bridge TypeScript para o plugin nativo HandLandmarker.
 *
 * Usa o MediaPipe Tasks SDK no Android via Frame Processor Plugin
 * do VisionCamera para detectar os 21 landmarks da mão localmente.
 *
 * Retorna coordenadas normalizadas [0, 1] para cada ponto,
 * além da classificação de lateralidade (Left/Right).
 *
 * @see https://github.com/CarlosEduFF/expo-vision-camera-v4-mediapipe
 */

import { VisionCameraProxy, Frame } from "react-native-vision-camera";

// Re-exporta tipos do plugin para uso no app
export type {
  HandLandmark as LandmarkPoint,
  HandDetectionResult as HandLandmarkResult,
  // Resultado holístico (mãos + corpo + rosto). Mesmo shape de
  // HandDetectionResult, com pose/face populados quando enablePose/enableFace
  // estão ligados no app.json.
  HolisticDetectionResult,
  HandednessCategory,
  PoseLandmark,
  FaceLandmark,
} from "expo-vision-camera-v4-mediapipe";

export { HandLandmarkIndex, PoseLandmarkIndex } from "expo-vision-camera-v4-mediapipe";

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
 * @returns Resultado com os landmarks, handedness, ou null se o plugin não carregou
 */
export function detectHandLandmarks(frame: Frame): import("expo-vision-camera-v4-mediapipe").HolisticDetectionResult | null {
  "worklet";

  if (plugin == null) {
    // Retorna null silenciosamente em vez de lançar exceção.
    // O código JS pode verificar via getPluginStatus().
    return null;
  }

  // O plugin já devolve pose/face quando enablePose/enableFace estão ativos
  // no app.json; o tipo holístico expõe esses campos sem mudar a chamada.
  const result = plugin.call(frame) as unknown as import("expo-vision-camera-v4-mediapipe").HolisticDetectionResult | null;
  return result;
}
