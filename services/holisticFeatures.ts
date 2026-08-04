/**
 * Montagem do payload holístico (mãos + corpo + rosto) enviado à API.
 *
 * Centraliza duas coisas que antes estavam duplicadas inline em cada tela
 * (cam, collect-static, collect-dynamic):
 *
 *  1. `transformPoint` — rotação/espelhamento aplicado aos landmarks da câmera
 *     frontal. DEVE ser idêntico para mãos, pose e face, senão os canais ficam
 *     em referenciais diferentes e o vetor de features no servidor fica
 *     inconsistente.
 *
 *  2. `buildPayload` — decide a *forma* do que vai pela WebSocket:
 *       - schema "hands_v1"    → array cru de mãos  `[[{x,y,z}×21], ...]`
 *       - schema "holistic_v1" → objeto `{ hands, pose, face }`
 *
 * O backend detecta o schema pela forma do payload (lista = hands_v1,
 * objeto = holistic_v1) e seleciona internamente os subconjuntos de pose/face
 * (POSE_INDICES / FACE_INDICES). Por isso o app envia pose/face COMPLETOS
 * (33 e 478 pontos) — NÃO pré-filtrar aqui, ou os índices do servidor não
 * baterão.
 *
 * @see ../../Li-Vision/src/api/holistic.py (parse_input)
 * @see ../../Li-Vision/src/data_collection/holistic_features.py
 */

import type {
  LandmarkPoint,
  PoseLandmark,
  FaceLandmark,
  HolisticDetectionResult,
} from "@/services/handLandmarkerPlugin";

export type FeatureSchema = "hands_v1" | "holistic_v1";

/** Mão / face transformadas: {x,y,z}. Pose mantém também visibility. */
export type TPoint = { x: number; y: number; z: number };
export type TPosePoint = TPoint & { visibility: number };

export type HolisticPayload =
  | TPoint[][] // hands_v1 — array cru de mãos (formato legado)
  | {
      hands: TPoint[][];
      pose?: TPosePoint[];
      face?: TPoint[];
    };

/**
 * Espelhamento horizontal para a câmera frontal.
 *
 * O plugin nativo (expo-vision-camera-v4-mediapipe >= 1.2.1) já corrige a
 * rotação do frame via ImageProcessingOptions antes de detectar, então os
 * landmarks chegam aqui já "em pé". Só falta o espelho horizontal típico de
 * câmera frontal (efeito selfie). Aplicar a antiga troca de eixos X⇄Y por
 * cima re-rotacionaria os pontos incorretamente — ver CHANGELOG do plugin.
 * Preserva z. Aplicada a TODOS os canais para mantê-los no mesmo referencial.
 *
 * Nota: é um worklet-safe puro (sem captura), então pode ser chamado tanto no
 * thread JS quanto repassado a partir de resultados já trazidos pelo runOnJS.
 */
export function transformPoint(lm: { x: number; y: number; z?: number }): TPoint {
  return { x: 1.0 - lm.x, y: lm.y, z: lm.z ?? 0 };
}

function transformHands(hands: LandmarkPoint[][]): TPoint[][] {
  return hands.map((hand) => hand.map(transformPoint));
}

function transformPose(pose: PoseLandmark[]): TPosePoint[] {
  return pose.map((lm) => ({
    ...transformPoint(lm),
    // visibility é uma probabilidade do ponto, invariante à rotação 2D.
    visibility: lm.visibility ?? 0,
  }));
}

function transformFace(face: FaceLandmark[]): TPoint[] {
  return face.map(transformPoint);
}

/**
 * Monta o payload pronto para `gestureWS.sendHolistic()` / `sendLandmarks()`.
 *
 * @param result  Resultado holístico cru vindo do plugin (pode ter pose/face).
 * @param schema  "holistic_v1" envia o objeto completo; "hands_v1" envia só o
 *                array de mãos (compat total com datasets/modelos antigos).
 * @returns       Payload já transformado, ou `null` se não há mãos detectadas.
 */
export function buildPayload(
  result: HolisticDetectionResult,
  schema: FeatureSchema,
): HolisticPayload | null {
  const rawHands = result?.hands ?? [];
  if (rawHands.length === 0) return null;

  const hands = transformHands(rawHands);

  if (schema === "hands_v1") {
    // Formato legado: array cru de mãos. O backend o lê como hands_v1.
    return hands;
  }

  // holistic_v1: objeto com canais opcionais. pose/face só entram se o plugin
  // os detectou neste frame (podem faltar mesmo com os canais habilitados).
  const payload: { hands: TPoint[][]; pose?: TPosePoint[]; face?: TPoint[] } = { hands };
  if (result.pose && result.pose.length > 0) payload.pose = transformPose(result.pose);
  if (result.face && result.face.length > 0) payload.face = transformFace(result.face);
  return payload;
}
