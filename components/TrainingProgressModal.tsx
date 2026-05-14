import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Easing,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BAR_WIDTH = SCREEN_WIDTH - 100;

interface TrainingJob {
  type: string;
  status: string;
  progress?: number;
  current_epoch?: number;
  total_epochs?: number;
  stage?: string;
  accuracy?: number;
  error?: string;
}

interface TrainingProgressModalProps {
  visible: boolean;
  status: "running" | "completed" | "failed" | "pending";
  progress: number; // 0-100
  jobs: TrainingJob[];
  onClose: () => void;
}

const STAGE_LABELS: Record<string, string> = {
  loading_data: "Carregando dados",
  preparing_model: "Preparando modelo",
  training: "Treinando",
  evaluating: "Avaliando resultados",
};

function formatTime(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export default function TrainingProgressModal({
  visible,
  status,
  progress,
  jobs,
  onClose,
}: TrainingProgressModalProps) {
  // ── Animated values ──────────────────────────────────────
  const barWidth = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Timer state ──────────────────────────────────────────
  const [elapsed, setElapsed] = useState(0);
  const [eta, setEta] = useState<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Reset timer when modal opens ─────────────────────────
  useEffect(() => {
    if (visible && status === "running") {
      startTimeRef.current = Date.now();
      setElapsed(0);
      setEta(null);

      timerRef.current = setInterval(() => {
        const now = Date.now();
        const elapsedSec = (now - startTimeRef.current) / 1000;
        setElapsed(elapsedSec);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [visible, status]);

  // ── Stop timer when done ─────────────────────────────────
  useEffect(() => {
    if (status === "completed" || status === "failed") {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [status]);

  // ── Calculate ETA ────────────────────────────────────────
  useEffect(() => {
    if (progress > 5 && progress < 100 && elapsed > 3) {
      const rate = progress / elapsed; // % per second
      const remaining = (100 - progress) / rate;
      setEta(remaining);
    } else if (progress >= 100) {
      setEta(0);
    }
  }, [progress, elapsed]);

  // ── Animate progress bar ─────────────────────────────────
  useEffect(() => {
    Animated.timing(barWidth, {
      toValue: progress,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // ── Pulse animation while running ────────────────────────
  useEffect(() => {
    if (status === "running") {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status]);

  // ── Spin animation for gear icon ─────────────────────────
  useEffect(() => {
    if (status === "running") {
      const spin = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spin.start();
      return () => spin.stop();
    } else {
      spinAnim.setValue(0);
    }
  }, [status]);

  // ── Fade in on mount ─────────────────────────────────────
  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const spinInterpolation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const barWidthInterpolated = barWidth.interpolate({
    inputRange: [0, 100],
    outputRange: [0, BAR_WIDTH],
  });

  const isDone = status === "completed" || status === "failed";
  const isSuccess = status === "completed";

  // ── Build stage description ──────────────────────────────
  const getStageText = (): string => {
    if (isDone) return isSuccess ? "Treinamento concluído!" : "Treinamento falhou.";
    if (jobs.length === 0) return "Iniciando treinamento...";

    const activeJob = jobs.find((j) => j.status === "running") || jobs[0];
    const typeLabel = activeJob.type === "static" ? "estático" : "dinâmico";
    const stageName = STAGE_LABELS[activeJob.stage || ""] || activeJob.stage || "Processando";

    if (activeJob.stage === "training" && activeJob.current_epoch && activeJob.total_epochs) {
      return `${stageName} modelo ${typeLabel} — Epoch ${activeJob.current_epoch}/${activeJob.total_epochs}`;
    }

    return `${stageName} — modelo ${typeLabel}`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: pulseAnim }] }]}>
          {/* ── Icon ─────────────────────────── */}
          <View style={styles.iconContainer}>
            {isDone ? (
              <View style={[styles.iconCircle, { backgroundColor: isSuccess ? "rgba(76, 175, 80, 0.15)" : "rgba(255, 82, 82, 0.15)" }]}>
                <MaterialIcons
                  name={isSuccess ? "check-circle" : "error"}
                  size={48}
                  color={isSuccess ? "#4caf50" : "#ff5252"}
                />
              </View>
            ) : (
              <View style={styles.iconCircle}>
                <Animated.View style={{ transform: [{ rotate: spinInterpolation }] }}>
                  <MaterialIcons name="settings" size={48} color="#00e5ff" />
                </Animated.View>
              </View>
            )}
          </View>

          {/* ── Title ────────────────────────── */}
          <Text style={styles.title}>
            {isDone
              ? isSuccess
                ? "Treinamento Concluído"
                : "Treinamento Falhou"
              : "Treinando Modelo"}
          </Text>

          {/* ── Progress Percentage ───────────── */}
          <Text style={[styles.percentage, isDone && { color: isSuccess ? "#4caf50" : "#ff5252" }]}>
            {Math.min(progress, 100)}%
          </Text>

          {/* ── Progress Bar ─────────────────── */}
          <View style={styles.barTrack}>
            <Animated.View
              style={[
                styles.barFill,
                {
                  width: barWidthInterpolated,
                  backgroundColor: isDone
                    ? isSuccess
                      ? "#4caf50"
                      : "#ff5252"
                    : "#00e5ff",
                },
              ]}
            />
            {!isDone && (
              <Animated.View
                style={[
                  styles.barShimmer,
                  { width: barWidthInterpolated },
                ]}
              />
            )}
          </View>

          {/* ── Stage Description ────────────── */}
          <Text style={styles.stageText}>{getStageText()}</Text>

          {/* ── Time Info ────────────────────── */}
          <View style={styles.timeRow}>
            <View style={styles.timeBlock}>
              <MaterialIcons name="timer" size={14} color="#555" />
              <Text style={styles.timeLabel}>Decorrido</Text>
              <Text style={styles.timeValue}>{formatTime(elapsed)}</Text>
            </View>
            {!isDone && eta !== null && (
              <View style={styles.timeBlock}>
                <MaterialIcons name="hourglass-bottom" size={14} color="#555" />
                <Text style={styles.timeLabel}>Restante</Text>
                <Text style={styles.timeValue}>~{formatTime(eta)}</Text>
              </View>
            )}
          </View>

          {/* ── Sub-Jobs ─────────────────────── */}
          {jobs.length > 0 && (
            <View style={styles.jobsContainer}>
              {jobs.map((job, idx) => (
                <View key={idx} style={styles.jobRow}>
                  <MaterialIcons
                    name={
                      job.status === "completed"
                        ? "check-circle"
                        : job.status === "failed"
                        ? "cancel"
                        : "sync"
                    }
                    size={16}
                    color={
                      job.status === "completed"
                        ? "#4caf50"
                        : job.status === "failed"
                        ? "#ff5252"
                        : "#00e5ff"
                    }
                  />
                  <Text style={styles.jobType}>
                    {job.type === "static" ? "Estático" : "Dinâmico"}
                  </Text>
                  <View style={{ flex: 1 }} />
                  {job.status === "completed" && job.accuracy != null ? (
                    <Text style={styles.jobAccuracy}>
                      {(job.accuracy * 100).toFixed(1)}%
                    </Text>
                  ) : job.status === "failed" ? (
                    <Text style={styles.jobError}>Erro</Text>
                  ) : (
                    <Text style={styles.jobProgress}>{job.progress || 0}%</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* ── Error message ────────────────── */}
          {status === "failed" && jobs.some((j) => j.error) && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                {jobs.find((j) => j.error)?.error}
              </Text>
            </View>
          )}

          {/* ── Close Button ─────────────────── */}
          {isDone && (
            <TouchableOpacity
              style={[styles.closeBtn, isSuccess && styles.closeBtnSuccess]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={isSuccess ? "done" : "close"}
                size={20}
                color={isSuccess ? "#000" : "#fff"}
              />
              <Text style={[styles.closeBtnText, isSuccess && { color: "#000" }]}>
                {isSuccess ? "Concluído" : "Fechar"}
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  container: {
    width: "100%",
    backgroundColor: "#1c2026",
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.15)",
    shadowColor: "#00e5ff",
    shadowOpacity: 0.1,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(0, 229, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.12)",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  percentage: {
    fontSize: 48,
    fontWeight: "900",
    color: "#00e5ff",
    marginBottom: 16,
    fontVariant: ["tabular-nums"],
  },

  // ── Progress Bar ─────────────────────
  barTrack: {
    width: BAR_WIDTH,
    height: 10,
    backgroundColor: "#10141a",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 16,
  },
  barFill: {
    height: "100%",
    borderRadius: 5,
  },
  barShimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    borderRadius: 5,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },

  // ── Stage ────────────────────────────
  stageText: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 18,
    paddingHorizontal: 10,
  },

  // ── Time ─────────────────────────────
  timeRow: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 20,
  },
  timeBlock: {
    alignItems: "center",
    gap: 4,
  },
  timeLabel: {
    fontSize: 10,
    color: "#555",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  timeValue: {
    fontSize: 16,
    color: "#ccc",
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },

  // ── Sub Jobs ─────────────────────────
  jobsContainer: {
    width: "100%",
    backgroundColor: "#10141a",
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 20,
  },
  jobRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  jobType: {
    fontSize: 13,
    color: "#ccc",
    fontWeight: "600",
  },
  jobAccuracy: {
    fontSize: 13,
    color: "#4caf50",
    fontWeight: "700",
  },
  jobError: {
    fontSize: 13,
    color: "#ff5252",
    fontWeight: "700",
  },
  jobProgress: {
    fontSize: 13,
    color: "#00e5ff",
    fontWeight: "700",
  },

  // ── Error Box ────────────────────────
  errorBox: {
    width: "100%",
    backgroundColor: "rgba(255, 82, 82, 0.08)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 82, 82, 0.2)",
  },
  errorText: {
    fontSize: 12,
    color: "#ff8a80",
    textAlign: "center",
    lineHeight: 17,
  },

  // ── Close Button ─────────────────────
  closeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    width: "100%",
  },
  closeBtnSuccess: {
    backgroundColor: "#00e5ff",
    borderColor: "transparent",
    shadowColor: "#00e5ff",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ccc",
  },
});
