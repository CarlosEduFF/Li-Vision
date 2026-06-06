import { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, TextInput, Dimensions, Alert, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trainingService } from "@/services/trainingService";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Camera, useCameraDevice, useFrameProcessor } from "react-native-vision-camera";
import { Worklets } from "react-native-worklets-core";
import { detectHandLandmarks, LandmarkPoint } from "@/services/handLandmarkerPlugin";
import { gestureWS } from "@/services/gestureWebSocket";
import { useTranslation } from "react-i18next";
import { collectDynamicStyles as styles } from "@/styles/collect-dynamic.styles";

export default function CollectDynamicScreen() {
  const [label, setLabel] = useState("");
  const [datasetName, setDatasetName] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(isRecording);
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sequences, setSequences] = useState(0);
  const [landmarks, setLandmarks] = useState<LandmarkPoint[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [gestureLabels, setGestureLabels] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [labelHint, setLabelHint] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    loadDatasets();
    AsyncStorage.getItem("userRole").then(r => setIsAdmin(r === "admin"));
  }, []);

  useEffect(() => {
    const ds = datasets.find(d => d.name === datasetName);
    if (ds) {
      loadLabels(ds.id);
    } else {
      setGestureLabels([]);
    }
  }, [datasetName, datasets]);

  const loadDatasets = async () => {
    try {
      const res = await trainingService.getDatasets();
      if (res && res.datasets) {
        setDatasets(res.datasets.filter((d: any) => d.type === "dynamic"));
      }
    } catch (e) {
      console.log("Failed to load datasets", e);
    }
  };

  const loadLabels = async (id: string) => {
    try {
      const res = await trainingService.getDatasetStats(id);
      if (res && res.stats) {
        setGestureLabels(Object.keys(res.stats));
      }
    } catch (e) {
      console.log("Failed to load labels", e);
    }
  };

  const device = useCameraDevice("front");
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

  const transformPoint = (lm: any) => ({ x: 1.0 - lm.y, y: 1.0 - lm.x, z: lm.z });

  const onLandmarksDetected = Worklets.createRunOnJS((hands: LandmarkPoint[][]) => {
    if (hands.length > 0) {
      const transformedHands = hands.map(handLms => handLms.map(transformPoint));
      setLandmarks(transformedHands[0]);

      if (isRecordingRef.current && gestureWS.isConnected()) {
        gestureWS.sendLandmarks(transformedHands);
      }
    } else {
      setLandmarks([]);
    }
  });

  const lastSync = Worklets.createSharedValue(0);
  const frameProcessor = useFrameProcessor((frame) => {
    "worklet";
    const now = performance.now();
    // dynamic collection needs maybe faster frames like 20 FPS config (50ms)
    if (now - lastSync.value < 50) return;
    lastSync.value = now;

    try {
      const result = detectHandLandmarks(frame);
      if (result && result.hands && result.hands.length > 0) {
        onLandmarksDetected(result.hands);
      } else {
        onLandmarksDetected([]);
      }
    } catch (e) {
      onLandmarksDetected([]);
    }
  }, [lastSync, isRecording]);

  useEffect(() => {
    gestureWS.connect((res) => {
      console.log("WS Response:", res);
      if (res.ok && res.sequences !== undefined) {
        setSequences(res.sequences);
        // Stop recording cleanly upon success
        if (isRecordingRef.current) {
          setIsRecording(false);
          gestureWS.sendAction({ action: "stop_collect" });
          if (recordingTimeoutRef.current) {
             clearTimeout(recordingTimeoutRef.current);
             recordingTimeoutRef.current = null;
          }
        }
      }
      if (!res.ok && res.error) {
        console.error("WS Error:", res.error);
        if (isRecordingRef.current) {
          setIsRecording(false);
          gestureWS.sendAction({ action: "stop_collect" });
        }
      }
    }, () => { });

    return () => {
      gestureWS.disconnect();
    };
  }, []);

  const startDynamic = async () => {
    if (!label || !datasetName) {
      Alert.alert(t('collect_static.warning'), t('collect_static.fill_required'));
      return;
    }

    try {
      setIsRecording(true);
      const userId = await AsyncStorage.getItem("userId") || undefined;
      
      gestureWS.sendAction({ 
        action: "start_collect", 
        label, 
        dataset_name: datasetName, 
        user_id: userId 
      });

      // Allow up to 6 seconds for the user to provide 15 valid ML frames
      recordingTimeoutRef.current = setTimeout(() => {
        if (isRecordingRef.current) {
           gestureWS.sendAction({ action: "stop_collect" });
           setIsRecording(false);
           Alert.alert(t('collect_dynamic.timeout_title'), t('collect_dynamic.timeout_msg'));
        }
      }, 6000);
    } catch (e) {
      Alert.alert(t('collect_dynamic.recording_error'), String(e));
      setIsRecording(false);
    }
  };

  const finalizeDataset = () => {
    Alert.alert(
      t('collect_dynamic.success_title'),
      t('collect_dynamic.success_msg', { label, count: sequences, datasetName }),
      [{ text: "OK", onPress: () => router.back() }]
    );
  };

  const CAM_WIDTH = screenWidth - 32;
  const CAM_HEIGHT = 280;

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={28} color="#00e5ff" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('collect_dynamic.title')}</Text>
      </View>

      <View style={[styles.cameraContainer, { width: CAM_WIDTH, height: CAM_HEIGHT }]}>
        {device ? (
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={true}
            frameProcessor={frameProcessor}
          />
        ) : (
          <View style={styles.permissionBox}>
            <Text style={{ color: "#888" }}>{t('collect_static.waiting_camera')}</Text>
          </View>
        )}

        {landmarks.length === 21 && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {landmarks.map((lm, idx) => {
              const dotX = lm.x * CAM_WIDTH - 5;
              const dotY = lm.y * CAM_HEIGHT - 5;
              return <View key={idx} style={[styles.landmarkDot, { left: dotX, top: dotY, backgroundColor: isRecording ? "red" : "#00e5ff" }]} />;
            })}
          </View>
        )}

        {isRecording && (
          <View style={styles.recordingOverlay}>
            <MaterialIcons name="videocam" size={20} color="red" />
            <Text style={styles.recordingText}>{t('collect_dynamic.recording_status')}</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <Text style={styles.label}>{t('collect_static.dataset_name')}</Text>

          {datasets.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {datasets.map((ds) => (
                <TouchableOpacity
                  key={ds.id}
                  style={[styles.chip, datasetName === ds.name && styles.chipActive]}
                  onPress={() => setDatasetName(ds.name)}
                >
                  <Text style={[styles.chipText, datasetName === ds.name && styles.chipTextActive]}>
                    {ds.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {isAdmin ? (
            <TextInput
              style={styles.input}
              placeholderTextColor="#666"
              placeholder="EX: LIBRAS_V1"
              value={datasetName}
              onChangeText={setDatasetName}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          ) : (
            datasets.length === 0 && <Text style={{ color: "#888" }}>{t('collect_static.no_dataset')}</Text>
          )}

          <Text style={styles.label}>{t('collect_static.label_gesto')}</Text>
          {gestureLabels.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {gestureLabels.map((lbl) => (
                <TouchableOpacity
                  key={lbl}
                  style={[styles.chip, label === lbl && styles.chipActive]}
                  onPress={() => setLabel(lbl)}
                >
                  <Text style={[styles.chipText, label === lbl && styles.chipTextActive]}>
                    {lbl}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <TextInput
            style={[
              styles.input,
              labelHint && { borderColor: 'rgba(255, 171, 0, 0.5)' },
            ]}
            placeholderTextColor="#666"
            placeholder="EX: OI"
            value={label}
            autoCapitalize="characters"
            autoCorrect={false}
            onChangeText={(v) => {
              setLabel(v);
              const normalized = v.toUpperCase();
              if (normalized && gestureLabels.includes(normalized)) {
                setLabelHint(t('collect_dynamic.label_hint', { normalized }));
              } else {
                setLabelHint(null);
              }
            }}
          />
          {labelHint && (
            <View style={styles.labelHint}>
              <MaterialIcons name="info-outline" size={16} color="#ffab00" />
              <Text style={styles.labelHintText}>{labelHint}</Text>
            </View>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.captureBtn, isRecording && { backgroundColor: '#333' }]}
              onPress={startDynamic}
              disabled={isRecording}
            >
              <MaterialIcons name={isRecording ? "radio-button-checked" : "fiber-manual-record"} size={24} color={isRecording ? "red" : "#000"} />
              <Text style={[styles.captureBtnText, isRecording && { color: "#888" }]}>
                {isRecording ? t('collect_dynamic.recording_btn') : t('collect_dynamic.record_btn')}
              </Text>
            </TouchableOpacity>

            {sequences > 0 && !isRecording && (
              <TouchableOpacity style={styles.finalizeBtn} onPress={finalizeDataset}>
                <MaterialIcons name="check-circle" size={24} color="#fff" />
                <Text style={styles.finalizeBtnText}>{t('collect_static.finalize_btn')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.stats}>
            {t('collect_dynamic.stats', { count: sequences })}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}




