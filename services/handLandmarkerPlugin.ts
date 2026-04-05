/**
 * Bridge TypeScript para o plugin nativo HandLandmarker.
 *
 * Usa o MediaPipe Tasks SDK no Android via Frame Processor Plugin
 * do VisionCamera para detectar os 21 landmarks da mão localmente.
 *
 * Retorna coordenadas normalizadas [0, 1] para cada ponto.
 */

import { VisionCameraProxy, Frame } from "react-native-vision-camera";

// Inicializa o plugin nativo registrado com o nome "handLandmarker"
const plugin = VisionCameraProxy.initFrameProcessorPlugin("handLandmarker", {});

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
    throw new Error(
      'Plugin "handLandmarker" não encontrado. Verifique se o build nativo inclui o HandLandmarkerPlugin.'
    );
  }

  const result = plugin.call(frame) as unknown as HandLandmarkResult | null;
  return result;
}
