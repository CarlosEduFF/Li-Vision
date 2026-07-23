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
import { useTranslation } from "react-i18next";
import { useAppTheme } from "@/context/ThemeContext";
import { AppColorTokens } from "@/constants/theme";

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
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
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
    if (isDone) return isSuccess ? t('training_modal.completed') : t('training_modal.failed');
    if (jobs.length === 0) return t('training_modal.starting');

    const activeJob = jobs.find((j) => j.status === "running") || jobs[0];
    const typeLabel = activeJob.type === "static" ? t('training_modal.static') : t('training_modal.dynamic');
    const stageName = t(`training_modal.${activeJob.stage || 'processing'}`);

    if (activeJob.stage === "training" && activeJob.current_epoch && activeJob.total_epochs) {
      return t('training_modal.model_epoch', {
        stage: stageName,
        type: typeLabel,
        current: activeJob.current_epoch,
        total: activeJob.total_epochs
      });
    }

    return t('training_modal.model_stage', {
      stage: stageName,
      type: typeLabel
    });
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
                  color={isSuccess ? colors.accent.green : colors.accent.error}
                />
              </View>
            ) : (
              <View style={styles.iconCircle}>
                <Animated.View style={{ transform: [{ rotate: spinInterpolation }] }}>
                  <MaterialIcons name="settings" size={48} color={colors.primary} />
                </Animated.View>
              </View>
            )}
          </View>

          {/* ── Title ────────────────────────── */}
          <Text style={styles.title}>
            {isDone
              ? isSuccess
                ? t('training_modal.title_completed')
                : t('training_modal.title_failed')
              : t('training_modal.title_training')}
          </Text>

          {/* ── Progress Percentage ───────────── */}
          <Text style={[styles.percentage, isDone && { color: isSuccess ? colors.accent.green : colors.accent.error }]}>
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
                      ? colors.accent.green
                      : colors.accent.error
                    : colors.primary,
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
              <MaterialIcons name="timer" size={14} color={colors.text.secondary} />
              <Text style={styles.timeLabel}>{t('training_modal.elapsed')}</Text>
              <Text style={styles.timeValue}>{formatTime(elapsed)}</Text>
            </View>
            {!isDone && eta !== null && (
              <View style={styles.timeBlock}>
                <MaterialIcons name="hourglass-bottom" size={14} color={colors.text.secondary} />
                <Text style={styles.timeLabel}>{t('training_modal.remaining')}</Text>
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
                        ? colors.accent.green
                        : job.status === "failed"
                        ? colors.accent.error
                        : colors.primary
                    }
                  />
                  <Text style={styles.jobType}>
                    {job.type === "static" ? t('training_modal.static_type') : t('training_modal.dynamic_type')}
                  </Text>
                  <View style={{ flex: 1 }} />
                  {job.status === "completed" && job.accuracy != null ? (
                    <Text style={styles.jobAccuracy}>
                      {(job.accuracy * 100).toFixed(1)}%
                    </Text>
                  ) : job.status === "failed" ? (
                    <Text style={styles.jobError}>{t('training_modal.error')}</Text>
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
          <TouchableOpacity
            style={[styles.closeBtn, isSuccess && styles.closeBtnSuccess]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name={isSuccess ? "done" : "close"}
              size={20}
              color={isSuccess ? colors.background : colors.text.primary}
            />
            <Text style={[styles.closeBtnText, isSuccess && { color: colors.background }]}>
              {isSuccess ? t('training_modal.btn_completed') : isDone ? t('training_modal.btn_close') : t('training_modal.btn_hide')}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

function makeStyles(colors: AppColorTokens) {
  return StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  container: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border.cyan,
    shadowColor: colors.primary,
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
    backgroundColor: colors.border.cyan,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border.cyanMedium,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: "center",
  },
  percentage: {
    fontSize: 48,
    fontWeight: "900",
    color: colors.primary,
    marginBottom: 16,
    fontVariant: ["tabular-nums"],
  },

  // ── Progress Bar ─────────────────────
  barTrack: {
    width: BAR_WIDTH,
    height: 10,
    backgroundColor: colors.background,
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
    color: colors.text.secondary,
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
    color: colors.text.secondary,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  timeValue: {
    fontSize: 16,
    color: colors.text.tertiary,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },

  // ── Sub Jobs ─────────────────────────
  jobsContainer: {
    width: "100%",
    backgroundColor: colors.background,
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
    color: colors.text.tertiary,
    fontWeight: "600",
  },
  jobAccuracy: {
    fontSize: 13,
    color: colors.accent.green,
    fontWeight: "700",
  },
  jobError: {
    fontSize: 13,
    color: colors.accent.error,
    fontWeight: "700",
  },
  jobProgress: {
    fontSize: 13,
    color: colors.primary,
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
    color: colors.accent.error,
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
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    width: "100%",
  },
  closeBtnSuccess: {
    backgroundColor: colors.primary,
    borderColor: "transparent",
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text.tertiary,
  },
  });
}
