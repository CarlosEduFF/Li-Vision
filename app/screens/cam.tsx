import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Modal,
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
} from "@/services/handLandmarkerPlugin";
import { useModelStatus } from "@/hooks/useModelStatus";
import { trainingService } from "@/services/trainingService";
import speechService, { SpeechPreferences } from "@/services/speechService";
import { useSpellingDetector } from "@/hooks/useSpellingDetector";
import SpellingPanel from "@/components/voice/SpellingPanel";
import VoiceSettingsModal from "@/components/voice/VoiceSettingsModal";
import { camStyles as styles } from "./cam.styles";

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

export default function CameraScreen() {
  const [gesture, setGesture] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [apiError, setApiError] = useState<string | null>(null);
  const [landmarks, setLandmarks] = useState<LandmarkPoint[][]>([]);
  const [showLandmarks, setShowLandmarks] = useState<boolean>(true);
  const [detectionMode, setDetectionMode] = useState<DetectionMode>("hybrid");
  const [showModeModal, setShowModeModal] = useState<boolean>(false);
  const [activeModelName, setActiveModelName] = useState<string | null>(null);

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

  useEffect(() => {
    let mounted = true;
    speechService.init().then((prefs) => { if (mounted) setSpeechPrefs(prefs); });
    const unsubscribe = speechService.subscribe((prefs) => { if (mounted) setSpeechPrefs(prefs); });
    return () => { mounted = false; unsubscribe(); speechService.stop(); };
  }, []);

  const { status: modelStatus, errorMessage: modelError } = useModelStatus();
  const transformPoint = (lm: any) => ({ x: 1.0 - lm.y, y: 1.0 - lm.x, z: lm.z });
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
          "Erro de Conexão",
          `Falha ao conectar à API após várias tentativas.\n${message ?? ""}`,
          [{ text: "OK" }]
        );
      }
    }, []
  );

  useEffect(() => {
    const autoActivateModel = async () => {
      const activeId = await AsyncStorage.getItem("activeModelId");
      const modelName = await AsyncStorage.getItem("activeModelName");
      let finalModelName = modelName;
      if (modelName) setActiveModelName(modelName);

      if (!activeId) {
        try {
          const res = await trainingService.listModels();
          if (res.models && res.models.length > 0) {
            const best = res.models.sort((a: any, b: any) => b.accuracy - a.accuracy)[0];
            await trainingService.activateModel(best.id);
            await AsyncStorage.setItem("activeModelId", best.id);
            await AsyncStorage.setItem("activeModelName", best.name);
            finalModelName = best.name;
            setActiveModelName(best.name);
            console.log(`[AutoActivate] Modelo "${best.name}" ativado automaticamente`);
          }
        } catch (e) {
          console.log("[AutoActivate] Falha na ativação automática:", e);
        }
      }

      gestureWS.connect(handleGesture, handleStatusChange, detectionMode, finalModelName);
    };

    autoActivateModel();
    return () => gestureWS.disconnect();
  }, []);

  const changeMode = (mode: DetectionMode) => {
    setShowModeModal(false);
    setDetectionMode(mode);
    gestureWS.sendAction({ action: "set_mode", mode });
  };

  const onLandmarksDetected = Worklets.createRunOnJS((hands: LandmarkPoint[][]) => {
    if (hands.length > 0) {
      const transformedHands = hands.map(handLms => handLms.map(transformPoint));
      setLandmarks(transformedHands);
      if (gestureWS.isConnected()) gestureWS.sendLandmarks(transformedHands);
    } else {
      setLandmarks([]);
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
      const result = detectHandLandmarks(frame);
      if (shouldLog) {
        if (result) {
          const handsLen = result.hands ? result.hands.length : 0;
          const errorMsg = (result as any).error;
          sendLogToJS(
            `Frame #${frameCount.value}: ${frame.width}x${frame.height} → ${handsLen} mão(s)` +
            (errorMsg ? ` | ERRO: ${errorMsg}` : "")
          );
        } else {
          sendLogToJS(`Frame #${frameCount.value}: plugin retornou null`);
        }
      }
      if (result && result.hands && result.hands.length > 0) onLandmarksDetected(result.hands);
      else onLandmarksDetected([]);
    } catch (e: any) {
      if (shouldLog) onPluginError(`Frame: ${e?.message || String(e)}`);
      onLandmarksDetected([]);
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
  const testVoice = () => {
    speechService.speak("Olá! Eu falo os gestos que você realizar.", { interrupt: true });
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Voltar">
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowModeModal(true)}
          style={[styles.iconBtn, styles.modeBtnActive]}
          accessibilityLabel="Selecionar modo de detecção"
        >
          <MaterialIcons name={(currentModeConfig?.icon as any) || "memory"} size={18} color="#00e5ff" />
          <Text style={styles.modeBtnText} numberOfLines={1} ellipsizeMode="tail">
            {currentModeConfig?.label || detectionMode}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowLandmarks((v) => !v)}
          style={[styles.iconBtn, showLandmarks && styles.iconBtnActive]}
          accessibilityLabel="Alternar landmarks"
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
            frameProcessor={modelStatus === "ready" ? frameProcessor : undefined}
          />
        ) : (
          <View style={styles.permissionBox}>
            <MaterialIcons name="videocam-off" size={48} color="#888" />
            <Text style={styles.warn}>Aguardando permissão da câmera...</Text>
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
            {modelStatus === "ready" ? "Edge" : "Edge ✗"}
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
            onFinalize={spelling.finalize}
            onClear={spelling.clear}
          />
        )}

        {modelStatus === "error" && (
          <View style={styles.modelErrorBanner}>
            <MaterialIcons name="error" size={20} color="#ff6b6b" />
            <View style={{ flex: 1 }}>
              <Text style={styles.modelErrorTitle}>Modelo Edge indisponível</Text>
              <Text style={styles.modelErrorDesc} numberOfLines={2}>
                {modelError || "HandLandmarker não carregou. Detecção local desativada."}
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
            <Text style={styles.noHandText}>Nenhuma mão detectada</Text>
          </View>
        )}
      </View>

      {/* MODAL SELEÇÃO DE MODO */}
      <Modal transparent visible={showModeModal} animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="memory" size={28} color="#00e5ff" />
              <Text style={styles.modalTitle}>Modo de Detecção</Text>
            </View>
            <Text style={styles.modalSubtitle}>
              Escolha o cérebro de reconhecimento para esta sessão.
            </Text>

            {DETECTION_MODES.map((mode) => {
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
                        {mode.label}
                      </Text>
                      <Text style={styles.modeDesc}>{mode.desc}</Text>
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
              <Text style={styles.modalCloseBtnText}>Fechar</Text>
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
        onTestVoice={testVoice}
      />
    </View>
  );
}
