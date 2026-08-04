import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Modal,
  Switch,
} from "react-native";
import {
  Camera,
  useCameraDevice,
  useFrameProcessor,
  useCameraPermission,
} from "react-native-vision-camera";
import { Worklets } from "react-native-worklets-core";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  gestureWS,
  ConnectionStatus,
  GestureResult,
  DetectionMode,
} from "@/services/gestureWebSocket";
import {
  detectHandLandmarks,
  LandmarkPoint,
  PoseLandmark,
  FaceLandmark,
  HolisticDetectionResult,
  PoseLandmarkIndex,
} from "@/services/handLandmarkerPlugin";
import { buildPayload, transformPoint } from "@/services/holisticFeatures";
import { useModelStatus } from "@/hooks/useModelStatus";
import { trainingService } from "@/services/trainingService";
import speechService, { getSpeechLanguageConfig, SpeechPreferences } from "@/services/speechService";
import { useSpellingDetector } from "@/hooks/useSpellingDetector";
import SpellingPanel from "@/components/voice/SpellingPanel";
import VoiceSettingsModal from "@/components/voice/VoiceSettingsModal";
import { makeCamStyles } from "@/styles/cam.styles";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "@/context/ThemeContext";

const DETECTION_MODES: { key: DetectionMode; label: string; desc: string; icon: string }[] = [
  { key: "hybrid",     label: "Híbrido",        desc: "Combina regras + ML estático + ML dinâmico",   icon: "merge-type" },
  { key: "rules",      label: "Regras Lógicas", desc: "Apenas detectores baseados em lógica (A–E)",   icon: "calculate" },
  { key: "ml",         label: "ML Estático",    desc: "Apenas modelos de gestos sem movimento",       icon: "pan-tool" },
  { key: "dynamic_ml", label: "ML Dinâmico",    desc: "Apenas modelos de gestos com movimento",       icon: "dynamic-form" },
];

const SKELETON_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

// Esqueleto de pose (MediaPipe Pose, 33 pontos) — só ombros, cotovelos e
// pulsos. Quadris ficam de fora: numa câmera frontal de celular em uso normal
// de Libras (tronco superior próximo à câmera) eles quase nunca entram no
// enquadramento, então exigi-los deixava a pose inteira sem desenhar.
const POSE_CONNECTIONS: [number, number][] = [
  [PoseLandmarkIndex.LEFT_SHOULDER, PoseLandmarkIndex.RIGHT_SHOULDER],
  [PoseLandmarkIndex.LEFT_SHOULDER, PoseLandmarkIndex.LEFT_ELBOW],
  [PoseLandmarkIndex.LEFT_ELBOW, PoseLandmarkIndex.LEFT_WRIST],
  [PoseLandmarkIndex.RIGHT_SHOULDER, PoseLandmarkIndex.RIGHT_ELBOW],
  [PoseLandmarkIndex.RIGHT_ELBOW, PoseLandmarkIndex.RIGHT_WRIST],
];

// Subconjunto leve de pontos do rosto (contorno + olhos + boca) — desenhar
// os 478 pontos completos do FaceLandmarker poluiria demais a tela.
const FACE_POINT_INDICES: number[] = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379,
  378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
  162, 21, 54, 103, 67, 109, // contorno do rosto
  33, 133, 160, 159, 158, 157, 173, 246, // olho esquerdo
  362, 263, 387, 386, 385, 384, 398, 466, // olho direito
  61, 291, 39, 269, 0, 17, 84, 314, // boca
];

export default function CameraScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeCamStyles(colors), [colors]);
  const [gesture, setGesture] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [apiError, setApiError] = useState<string | null>(null);
  const [landmarks, setLandmarks] = useState<LandmarkPoint[][]>([]);
  const [poseLandmarks, setPoseLandmarks] = useState<PoseLandmark[]>([]);
  const [faceLandmarks, setFaceLandmarks] = useState<FaceLandmark[]>([]);
  const [showLandmarks, setShowLandmarks] = useState<boolean>(true);
  const [showLandmarksModal, setShowLandmarksModal] = useState<boolean>(false);
  const [detectionMode, setDetectionMode] = useState<DetectionMode>("hybrid");
  const [showModeModal, setShowModeModal] = useState<boolean>(false);
  const [activeModelName, setActiveModelName] = useState<string | null>(null);
  const [availableModes, setAvailableModes] = useState(DETECTION_MODES);
  // Holístico: quando ON, envia mãos + corpo + rosto (schema holistic_v1).
  // Quando OFF, envia só mãos (hands_v1) — compat com modelos antigos.
  const [holisticEnabled, setHolisticEnabled] = useState<boolean>(false);
  const holisticEnabledRef = useRef(holisticEnabled);
  const { t } = useTranslation();

  // Voz / Soletração
  const [speechPrefs, setSpeechPrefs] = useState<SpeechPreferences>(speechService.getPreferences());
  const [showSpeechModal, setShowSpeechModal] = useState<boolean>(false);
  const [lastSpokenWord, setLastSpokenWord] = useState<string | null>(null);

  const handleWordComplete = useCallback((word: string) => {
    setLastSpokenWord(word);
    speechService.speakWord(word);
    setTimeout(() => setLastSpokenWord((prev) => (prev === word ? null : prev)), 4000);
  }, []);

  const spellingConfig = useMemo(() => ({
    spellingIdleMs: speechPrefs.spellingIdleMs,
    letterStableMs: speechPrefs.letterStableMs,
    minConfidence: speechPrefs.minConfidence,
    enabled: speechPrefs.enabled && speechPrefs.spellingEnabled,
  }), [
    speechPrefs.spellingIdleMs,
    speechPrefs.letterStableMs,
    speechPrefs.minConfidence,
    speechPrefs.enabled,
    speechPrefs.spellingEnabled,
  ]);

  const spelling = useSpellingDetector({
    config: spellingConfig,
    onWordComplete: handleWordComplete,
  });

  useEffect(() => { holisticEnabledRef.current = holisticEnabled; }, [holisticEnabled]);

  useEffect(() => {
    let mounted = true;
    speechService.init().then((prefs) => { if (mounted) setSpeechPrefs(prefs); });
    AsyncStorage.getItem("config_holistic_enabled").then((v) => {
      if (mounted && v === "true") setHolisticEnabled(true);
    });

    const checkRulesConfig = async () => {
      let rulesEnabled = true;
      try {
        const rulesState = await trainingService.getRulesEnabled();
        if (rulesState !== undefined) {
          rulesEnabled = rulesState;
          await AsyncStorage.setItem("config_rules_enabled", String(rulesEnabled));
        } else {
          const rulesStored = await AsyncStorage.getItem("config_rules_enabled");
          rulesEnabled = rulesStored !== "false";
        }
      } catch (e) {
        console.log("Erro ao carregar rules da API no cam, usando local:", e);
        const rulesStored = await AsyncStorage.getItem("config_rules_enabled");
        rulesEnabled = rulesStored !== "false";
      }

      const userRole = await AsyncStorage.getItem("userRole");
      
      // Filtra os modos baseados no papel do usuário e config global
      const filtered = DETECTION_MODES.filter(m => {
        if (m.key === "rules") {
          // Só admin vê modo rules, e só se estiver habilitado
          return userRole === "admin" && rulesEnabled;
        }
        // Híbrido, ML e Dinâmico sempre aparecem
        return true;
      });

      if (mounted) {
        setAvailableModes(filtered);
        // Se o modo atual sumiu, reseta para hybrid
        if (!filtered.find(m => m.key === detectionMode)) {
          setDetectionMode("hybrid");
        }
      }
    };
    checkRulesConfig();

    const unsubscribe = speechService.subscribe((prefs) => { if (mounted) setSpeechPrefs(prefs); });
    return () => { mounted = false; unsubscribe(); speechService.stop(); };
  }, []);

  const { status: modelStatus, errorMessage: modelError } = useModelStatus();
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
  const device = useCameraDevice("front");
  const { hasPermission, requestPermission } = useCameraPermission();

  useEffect(() => { if (!hasPermission) requestPermission(); }, [hasPermission]);

  const handleGesture = useCallback((result: GestureResult) => {
    if (result.error) {
      console.log("[API Error]:", result.error);
      setApiError(result.error);
      setTimeout(() => setApiError(null), 3000);
    } else {
      setApiError(null);
    }

    if (result.gesture) {
      setGesture(result.gesture);
      setConfidence(result.confidence);

      const prefs = speechService.getPreferences();
      const conf = result.confidence ?? 0;
      const label = result.gesture;

      // Alimenta o detector de soletração (filtro interno para letras)
      spelling.onDetection(label, conf);

      // Coexistência: se soletração está ON e é letra, não fala individual.
      const looksLikeLetter =
        typeof label === "string" &&
        label.trim().length === 1 &&
        /^[A-Za-zÀ-ÿ]$/.test(label.trim());

      const shouldSpeakIndividual =
        prefs.enabled &&
        prefs.speakGestures &&
        !(prefs.spellingEnabled && looksLikeLetter);

      if (shouldSpeakIndividual) speechService.speakGesture(label);
    }

    if (result.mode) setDetectionMode(result.mode as DetectionMode);
  }, [spelling]);

  const handleStatusChange = useCallback(
    (status: ConnectionStatus, message?: string) => {
      setConnectionStatus(status);
      if (status === "failed") {
        Alert.alert(
          t('cam.connection_error'),
          `${t('cam.api_fail')}\n${message ?? ""}`,
          [{ text: "OK" }]
        );
      }
    }, []
  );

  // Ref para manter referência estável do handleGesture/handleStatusChange
  const handleGestureRef = useRef(handleGesture);
  handleGestureRef.current = handleGesture;
  const handleStatusChangeRef = useRef(handleStatusChange);
  handleStatusChangeRef.current = handleStatusChange;

  // Conecta/reconecta o WS toda vez que a tela ganha foco
  // Isso garante que ao voltar de 'select-model', o modelo mais recente é usado
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const activateAndConnect = async () => {
        const activeId = await AsyncStorage.getItem("activeModelId");
        const modelName = await AsyncStorage.getItem("activeModelName");
        let finalModelName = modelName;
        if (modelName) setActiveModelName(modelName);

        if (!activeId) {
          // Nenhum modelo selecionado — tenta auto-ativar o melhor
          try {
            const res = await trainingService.listModels();
            if (res.models && res.models.length > 0) {
              const best = res.models.sort((a: any, b: any) => (b.accuracy ?? 0) - (a.accuracy ?? 0))[0];
              await trainingService.activateModel(best.id);
              await AsyncStorage.setItem("activeModelId", best.id);
              await AsyncStorage.setItem("activeModelName", best.name);
              finalModelName = best.name;
              if (!cancelled) setActiveModelName(best.name);
              console.log(`[AutoActivate] Modelo "${best.name}" ativado automaticamente`);
            }
          } catch (e) {
            console.log("[AutoActivate] Falha na ativação automática:", e);
          }
        } else {
          // Modelo já selecionado — garante que está ativado no servidor
          // (filesystem efêmero do Render pode ter perdido o arquivo)
          try {
            await trainingService.activateModel(activeId);
          } catch (e) {
            console.log("[ReActivate] Falha ao re-ativar modelo:", e);
          }
        }

        if (!cancelled) {
          let rulesEnabled = true;
          try {
            const rulesState = await trainingService.getRulesEnabled();
            if (rulesState !== undefined) {
              rulesEnabled = rulesState;
              await AsyncStorage.setItem("config_rules_enabled", String(rulesEnabled));
            } else {
              const rulesStored = await AsyncStorage.getItem("config_rules_enabled");
              rulesEnabled = rulesStored !== "false";
            }
          } catch (e) {
            const rulesStored = await AsyncStorage.getItem("config_rules_enabled");
            rulesEnabled = rulesStored !== "false";
          }

          gestureWS.connect(
            (result) => handleGestureRef.current(result),
            (status, msg) => handleStatusChangeRef.current(status, msg),
            detectionMode,
            finalModelName,
            rulesEnabled
          );
        }
      };

      activateAndConnect();

      return () => {
        cancelled = true;
        gestureWS.disconnect();
      };
    }, [])  // Sem dependência em detectionMode: troca de modo é feita in-session via sendAction
  );

  const changeMode = (mode: DetectionMode) => {
    setShowModeModal(false);
    // Apenas envia a ação para o servidor trocar o modo na sessão existente.
    // NÃO altere o state detectionMode aqui — isso acionaria o useFocusEffect
    // que desconecta e reconecta o WS, criando uma condição de corrida
    // onde a ação é enviada na conexão antiga que morre em seguida.
    // O state será atualizado pelo callback handleGesture quando o servidor
    // confirmar o novo modo na próxima resposta (result.mode).
    gestureWS.sendAction({ action: "set_mode", mode });
  };

  const onLandmarksDetected = Worklets.createRunOnJS((result: HolisticDetectionResult) => {
    const hands = result?.hands ?? [];
    // Mãos, pose e rosto são canais independentes no plugin nativo — a
    // ausência de uma mão no frame não deve zerar pose/rosto já detectados.
    setLandmarks(hands.map((handLms: LandmarkPoint[]) => handLms.map(transformPoint)));

    if (holisticEnabledRef.current) {
      setPoseLandmarks(result?.pose && result.pose.length > 0 ? result.pose.map(transformPoint) as PoseLandmark[] : []);
      setFaceLandmarks(result?.face && result.face.length > 0 ? result.face.map(transformPoint) as FaceLandmark[] : []);
    } else {
      setPoseLandmarks([]);
      setFaceLandmarks([]);
    }

    if (gestureWS.isConnected()) {
      const schema = holisticEnabledRef.current ? "holistic_v1" : "hands_v1";
      const payload = buildPayload(result, schema);
      if (payload) gestureWS.sendHolistic(payload);
    }
  });

  const sendLogToJS = Worklets.createRunOnJS((msg: string) => { console.log("[Edge MediaPipe]:", msg); });
  const onPluginError = Worklets.createRunOnJS((error: string) => { console.error("[Edge ERRO]:", error); });

  const lastSync = Worklets.createSharedValue(0);
  const frameCount = Worklets.createSharedValue(0);

  const frameProcessor = useFrameProcessor((frame) => {
    "worklet";
    const now = performance.now();
    if (now - lastSync.value < 100) return;
    lastSync.value = now;
    frameCount.value += 1;
    const shouldLog = frameCount.value % 30 === 1;

    try {
      // width/height lidos antes do detect: acessar props do frame dentro dos
      // argumentos de um runOnJS as avalia fora do ciclo de vida do frame.
      const frameWidth = frame.width;
      const frameHeight = frame.height;
      const result = detectHandLandmarks(frame);
      if (shouldLog) {
        if (result) {
          const handsLen = result.hands ? result.hands.length : 0;
          const errorMsg = (result as any).error;
          sendLogToJS(
            `Frame #${frameCount.value}: ${frameWidth}x${frameHeight} → ${handsLen} mão(s)` +
            (errorMsg ? ` | ERRO: ${errorMsg}` : "")
          );
        } else {
          sendLogToJS(`Frame #${frameCount.value}: plugin retornou null`);
        }
      }
      onLandmarksDetected(result ?? ({ hands: [] } as any));
    } catch (e: any) {
      if (shouldLog) onPluginError(`Frame: ${e?.message || String(e)}`);
      onLandmarksDetected({ hands: [] } as any);
    }
  }, [lastSync, frameCount]);

  const statusConfig = {
    color: connectionStatus === "connected" ? "#4caf50"
         : connectionStatus === "reconnecting" ? "#ff9800" : "#f44336",
    label: connectionStatus,
  };

  const currentModeConfig = DETECTION_MODES.find(m => m.key === detectionMode);
  const HEADER_HEIGHT = 90;
  const CAM_WIDTH = screenWidth - 32;
  const CAM_HEIGHT = screenHeight - HEADER_HEIGHT - 32;

  const toggleSpeech = async () => { await speechService.toggleEnabled(); };
  const toggleSpeakGestures = async () => { await speechService.toggleSpeakGestures(); };
  const toggleSpellingEnabled = async () => {
    const wasEnabled = speechPrefs.spellingEnabled;
    await speechService.toggleSpellingEnabled();
    if (wasEnabled) spelling.clear();
  };
  const adjustIdle = (d: number) => {
    const next = Math.min(5000, Math.max(1000, speechPrefs.spellingIdleMs + d));
    speechService.setPreferences({ spellingIdleMs: next });
  };
  const adjustStable = (d: number) => {
    const next = Math.min(1500, Math.max(200, speechPrefs.letterStableMs + d));
    speechService.setPreferences({ letterStableMs: next });
  };
  const adjustConfidence = (d: number) => {
    const next = Math.min(0.95, Math.max(0.3, +(speechPrefs.minConfidence + d).toFixed(2)));
    speechService.setPreferences({ minConfidence: next });
  };
  const setSpeechLanguage = (language: string) => {
    speechService.setLanguage(language);
  };
  const testVoice = () => {
    speechService.speak(getSpeechLanguageConfig(speechPrefs.language).testText, { interrupt: true });
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Voltar">
          <MaterialIcons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowModeModal(true)}
          style={[styles.iconBtn, styles.modeBtnActive]}
          accessibilityLabel={t('cam.mode_title')}
        >
          <MaterialIcons name={(currentModeConfig?.icon as any) || "memory"} size={18} color="#00e5ff" />
          <Text style={styles.modeBtnText} numberOfLines={1} ellipsizeMode="tail">
            {currentModeConfig ? t(`cam.mode_${currentModeConfig.key}`) : detectionMode}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowLandmarksModal(true)}
          style={[styles.iconBtn, showLandmarks && styles.iconBtnActive]}
          accessibilityLabel="Configurar landmarks exibidos"
        >
          <MaterialIcons name="grain" size={20} color={showLandmarks ? "#00e5ff" : "#888"} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={toggleSpeech}
          onLongPress={() => setShowSpeechModal(true)}
          style={[styles.iconBtn, speechPrefs.enabled && styles.iconBtnActive]}
          accessibilityLabel="Ativar/desativar síntese de voz"
        >
          <MaterialIcons
            name={speechPrefs.enabled ? "volume-up" : "volume-off"}
            size={20}
            color={speechPrefs.enabled ? "#00e5ff" : "#888"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowSpeechModal(true)}
          style={styles.iconBtn}
          accessibilityLabel="Configurações de voz"
        >
          <MaterialIcons name="settings-voice" size={20} color="#b388ff" />
        </TouchableOpacity>

        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
        </View>
      </View>

      {/* CÂMERA + OVERLAY */}
      <View style={[styles.cameraContainer, { width: CAM_WIDTH, height: CAM_HEIGHT }]}>
        {hasPermission && device ? (
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={true}
            pixelFormat="rgb"
            frameProcessor={modelStatus === "ready" ? frameProcessor : undefined}
          />
        ) : (
          <View style={styles.permissionBox}>
            <MaterialIcons name="videocam-off" size={48} color="#888" />
            <Text style={styles.warn}>{t('cam.permission_waiting')}</Text>
          </View>
        )}

        {showLandmarks && landmarks.length > 0 && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {landmarks.map((hand, handIdx) => {
              if (!hand || hand.length !== 21) return null;
              const HAND_COLORS = [
                { tip: "#00e5ff", bone: "rgba(0, 229, 255, 0.4)", dot: "rgba(255,255,255,0.7)", wrist: "#ff6b6b" },
                { tip: "#b388ff", bone: "rgba(179, 136, 255, 0.4)", dot: "rgba(220,200,255,0.7)", wrist: "#ff9800" },
              ];
              const colors = HAND_COLORS[handIdx % HAND_COLORS.length];

              return (
                <View key={`hand-${handIdx}`}>
                  {hand.map((lm, idx) => {
                    const dotX = lm.x * CAM_WIDTH - 5;
                    const dotY = lm.y * CAM_HEIGHT - 5;
                    const isTip = [4, 8, 12, 16, 20].includes(idx);
                    const isWrist = idx === 0;
                    return (
                      <View
                        key={`h${handIdx}-lm${idx}`}
                        style={[
                          styles.landmarkDot,
                          {
                            left: dotX,
                            top: dotY,
                            backgroundColor: isWrist ? colors.wrist : isTip ? colors.tip : colors.dot,
                            width: isTip || isWrist ? 10 : 7,
                            height: isTip || isWrist ? 10 : 7,
                            borderRadius: isTip || isWrist ? 5 : 3.5,
                          },
                        ]}
                      />
                    );
                  })}

                  {SKELETON_CONNECTIONS.map(([a, b], idx) => {
                    if (a >= hand.length || b >= hand.length) return null;
                    const ax = hand[a].x * CAM_WIDTH;
                    const ay = hand[a].y * CAM_HEIGHT;
                    const bx = hand[b].x * CAM_WIDTH;
                    const by = hand[b].y * CAM_HEIGHT;
                    const length = Math.hypot(bx - ax, by - ay);
                    const angle = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
                    return (
                      <View
                        key={`h${handIdx}-bone-${idx}`}
                        style={{
                          position: "absolute",
                          left: ax - length / 2,
                          top: ay - 0.75,
                          width: length,
                          height: 1.5,
                          backgroundColor: colors.bone,
                          transform: [
                            { translateX: length / 2 },
                            { rotate: `${angle}deg` },
                            { translateX: -(length / 2) },
                          ],
                        }}
                      />
                    );
                  })}
                </View>
              );
            })}

            {/* Pose (corpo) — só no modo Holístico */}
            {poseLandmarks.length > 0 &&
              POSE_CONNECTIONS.map(([a, b], idx) => {
                if (!poseLandmarks[a] || !poseLandmarks[b]) return null;
                if ((poseLandmarks[a].visibility ?? 0) < 0.3 || (poseLandmarks[b].visibility ?? 0) < 0.3) return null;
                const ax = poseLandmarks[a].x * CAM_WIDTH;
                const ay = poseLandmarks[a].y * CAM_HEIGHT;
                const bx = poseLandmarks[b].x * CAM_WIDTH;
                const by = poseLandmarks[b].y * CAM_HEIGHT;
                const length = Math.hypot(bx - ax, by - ay);
                const angle = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
                return (
                  <View
                    key={`pose-bone-${idx}`}
                    style={{
                      position: "absolute",
                      left: ax - length / 2,
                      top: ay - 1,
                      width: length,
                      height: 2,
                      backgroundColor: "rgba(76, 175, 80, 0.6)",
                      transform: [
                        { translateX: length / 2 },
                        { rotate: `${angle}deg` },
                        { translateX: -(length / 2) },
                      ],
                    }}
                  />
                );
              })}
            {poseLandmarks.length > 0 &&
              [
                PoseLandmarkIndex.LEFT_SHOULDER, PoseLandmarkIndex.RIGHT_SHOULDER,
                PoseLandmarkIndex.LEFT_ELBOW, PoseLandmarkIndex.RIGHT_ELBOW,
                PoseLandmarkIndex.LEFT_WRIST, PoseLandmarkIndex.RIGHT_WRIST,
              ].map((idx) => {
                const lm = poseLandmarks[idx];
                if (!lm || (lm.visibility ?? 0) < 0.3) return null;
                return (
                  <View
                    key={`pose-dot-${idx}`}
                    style={{
                      position: "absolute",
                      left: lm.x * CAM_WIDTH - 4,
                      top: lm.y * CAM_HEIGHT - 4,
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: "#4caf50",
                    }}
                  />
                );
              })}

            {/* Rosto — subconjunto leve de pontos, só no modo Holístico */}
            {faceLandmarks.length > 0 &&
              FACE_POINT_INDICES.map((idx) => {
                const lm = faceLandmarks[idx];
                if (!lm) return null;
                return (
                  <View
                    key={`face-dot-${idx}`}
                    style={{
                      position: "absolute",
                      left: lm.x * CAM_WIDTH - 1.5,
                      top: lm.y * CAM_HEIGHT - 1.5,
                      width: 3,
                      height: 3,
                      borderRadius: 1.5,
                      backgroundColor: "rgba(255, 214, 0, 0.8)",
                    }}
                  />
                );
              })}
          </View>
        )}

        {gesture && (
          <View style={styles.gestureOverlay}>
            <Text style={styles.gestureLabel}>{gesture}</Text>
            <View style={styles.confidencePill}>
              <Text style={styles.confidenceText}>{(confidence * 100).toFixed(0)}%</Text>
            </View>
          </View>
        )}

        <View style={styles.edgeBadge}>
          <MaterialIcons name="developer-board" size={12} color={modelStatus === "ready" ? "#00e5ff" : "#ff6b6b"} />
          <Text style={[styles.edgeBadgeText, modelStatus !== "ready" && { color: "#ff6b6b" }]}>
            {modelStatus === "ready" ? t('cam.edge_ready') : t('cam.edge_error')}
          </Text>
        </View>

        {activeModelName && (
          <View style={styles.modelBadge}>
            <MaterialIcons name="psychology" size={12} color="#b388ff" />
            <Text style={styles.modelBadgeText} numberOfLines={1}>{activeModelName}</Text>
          </View>
        )}

        {speechPrefs.spellingEnabled && speechPrefs.enabled && (
          <SpellingPanel
            isSpelling={spelling.isSpelling}
            buffer={spelling.buffer}
            candidate={spelling.candidate}
            lastSpokenWord={lastSpokenWord}
            letterStableMs={speechPrefs.letterStableMs}
            onFinalize={spelling.finalize}
            onClear={spelling.clear}
            onAdjustStable={adjustStable}
          />
        )}

        {modelStatus === "error" && (
          <View style={styles.modelErrorBanner}>
            <MaterialIcons name="error" size={20} color="#ff6b6b" />
            <View style={{ flex: 1 }}>
              <Text style={styles.modelErrorTitle}>{t('cam.edge_unavailable')}</Text>
              <Text style={styles.modelErrorDesc} numberOfLines={2}>
                {modelError || t('cam.edge_unavailable_desc')}
              </Text>
            </View>
          </View>
        )}

        {apiError && (
          <View style={styles.errorBanner}>
            <MaterialIcons name="error-outline" size={16} color="#ff6b6b" />
            <Text style={styles.errorText} numberOfLines={2}>{apiError}</Text>
          </View>
        )}

        {showLandmarks && landmarks.length === 0 && hasPermission && !apiError && (
          <View style={styles.noHandBadge}>
            <MaterialIcons name="pan-tool" size={14} color="#888" />
            <Text style={styles.noHandText}>{t('cam.no_hand')}</Text>
          </View>
        )}
      </View>

      {/* MODAL SELEÇÃO DE MODO */}
      <Modal transparent visible={showModeModal} animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="memory" size={28} color="#00e5ff" />
              <Text style={styles.modalTitle}>{t('cam.mode_title')}</Text>
            </View>
            <Text style={styles.modalSubtitle}>
              {t('cam.mode_subtitle')}
            </Text>

            {availableModes.map((mode) => {
              const isActive = detectionMode === mode.key;
              return (
                <TouchableOpacity
                  key={mode.key}
                  style={[styles.modeOption, isActive && styles.modeOptionActive]}
                  onPress={() => changeMode(mode.key)}
                  activeOpacity={0.7}
                >
                  <View style={styles.modeOptionLeft}>
                    <MaterialIcons
                      name={mode.icon as any}
                      size={22}
                      color={isActive ? "#00e5ff" : "#888"}
                    />
                    <View>
                      <Text style={[styles.modeLabel, isActive && styles.modeLabelActive]}>
                        {t(`cam.mode_${mode.key}`)}
                      </Text>
                      <Text style={styles.modeDesc}>{t(`cam.mode_${mode.key}_desc`)}</Text>
                    </View>
                  </View>
                  {isActive && (
                    <View style={styles.activeDotOuter}>
                      <View style={styles.activeDotInner} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowModeModal(false)}>
              <Text style={styles.modalCloseBtnText}>{t('cam.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE LANDMARKS EXIBIDOS */}
      <Modal transparent visible={showLandmarksModal} animationType="fade" onRequestClose={() => setShowLandmarksModal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="grain" size={28} color={colors.primary} />
              <Text style={styles.modalTitle}>{t('cam.landmarks_title')}</Text>
            </View>
            <Text style={styles.modalSubtitle}>{t('cam.landmarks_subtitle')}</Text>

            <View style={styles.landmarksRow}>
              <View style={styles.landmarksRowText}>
                <Text style={styles.landmarksRowTitle}>{t('cam.landmarks_show')}</Text>
                <Text style={styles.landmarksRowDesc}>{t('cam.landmarks_show_desc')}</Text>
              </View>
              <Switch
                value={showLandmarks}
                onValueChange={setShowLandmarks}
                trackColor={{ true: colors.primary, false: colors.border.subtle }}
                thumbColor={showLandmarks ? colors.surface : colors.text.secondary}
              />
            </View>

            <View style={[styles.landmarksRow, !showLandmarks && { opacity: 0.4 }]}>
              <View style={styles.landmarksRowText}>
                <Text style={styles.landmarksRowTitle}>{t('cam.landmarks_hands')}</Text>
                <Text style={styles.landmarksRowDesc}>{t('cam.landmarks_hands_desc')}</Text>
              </View>
              <MaterialIcons name="check-circle" size={22} color={colors.primary} />
            </View>

            <View style={[styles.landmarksRow, !showLandmarks && { opacity: 0.4 }]}>
              <View style={styles.landmarksRowText}>
                <Text style={styles.landmarksRowTitle}>{t('cam.landmarks_holistic')}</Text>
                <Text style={styles.landmarksRowDesc}>{t('cam.landmarks_holistic_desc')}</Text>
              </View>
              <Switch
                value={holisticEnabled}
                disabled={!showLandmarks}
                onValueChange={(next) => {
                  setHolisticEnabled(next);
                  AsyncStorage.setItem("config_holistic_enabled", String(next));
                }}
                trackColor={{ true: colors.primary, false: colors.border.subtle }}
                thumbColor={holisticEnabled ? colors.surface : colors.text.secondary}
              />
            </View>

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowLandmarksModal(false)}>
              <Text style={styles.modalCloseBtnText}>{t('cam.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE CONFIGURAÇÕES DE VOZ */}
      <VoiceSettingsModal
        visible={showSpeechModal}
        prefs={speechPrefs}
        onClose={() => setShowSpeechModal(false)}
        onToggleEnabled={toggleSpeech}
        onToggleSpeakGestures={toggleSpeakGestures}
        onToggleSpelling={toggleSpellingEnabled}
        onAdjustIdle={adjustIdle}
        onAdjustStable={adjustStable}
        onAdjustConfidence={adjustConfidence}
        onSetLanguage={setSpeechLanguage}
        onTestVoice={testVoice}
      />
    </View>
  );
}
