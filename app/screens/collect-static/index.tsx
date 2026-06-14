import { detectHandLandmarks, LandmarkPoint } from "@/services/handLandmarkerPlugin";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useMemo, useEffect, useState } from "react";
import { Alert, Dimensions, ScrollView, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { Camera, useCameraDevice, useFrameProcessor } from "react-native-vision-camera";
import { Worklets } from "react-native-worklets-core";
import { trainingService } from "@/services/trainingService";
import { useTranslation } from "react-i18next";
import { makeCollectStaticStyles as makeStyles } from "@/styles/collect-static.styles";
import { useAppTheme } from "@/context/ThemeContext";

export default function CollectStaticScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [label, setLabel] = useState("");
  const [datasetName, setDatasetName] = useState("");
  const [sampleCount, setSampleCount] = useState(0);
  const [landmarks, setLandmarks] = useState<LandmarkPoint[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [gestureLabels, setGestureLabels] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [labelHint, setLabelHint] = useState<string | null>(null);
  const { t } = useTranslation();

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
        // filter for static datasets only
        setDatasets(res.datasets.filter((d: any) => d.type === "static"));
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
  const { width: screenWidth } = Dimensions.get("window");

  // same transformation mode as cam.tsx
  // O plugin nativo já entrega coordenadas em pé (retrato); resta espelhar X (câmera frontal).
  const transformPoint = (lm: any) => ({ x: 1.0 - lm.x, y: lm.y, z: lm.z });

  const onLandmarksDetected = Worklets.createRunOnJS((hands: LandmarkPoint[][]) => {
    if (hands.length > 0) {
      const transformedHands = hands.map(handLms => handLms.map(transformPoint));
      setLandmarks(transformedHands[0]);
    } else {
      setLandmarks([]);
    }
  });

  const lastSync = Worklets.createSharedValue(0);

  const frameProcessor = useFrameProcessor((frame) => {
    "worklet";
    const now = performance.now();
    if (now - lastSync.value < 100) return;
    lastSync.value = now;

    try {
      const result = detectHandLandmarks(frame);
      if (result && result.hands && result.hands.length > 0) {
        onLandmarksDetected(result.hands);
      } else {
        onLandmarksDetected([]);
      }
    } catch {
      onLandmarksDetected([]);
    }
  }, [lastSync]);

  const captureStatic = async () => {
    if (!label || !datasetName) {
      Alert.alert(t('collect_static.warning'), t('collect_static.fill_required'));
      return;
    }
    if (landmarks.length < 21) {
      Alert.alert(t('collect_static.hand_not_detected_title'), t('collect_static.hand_not_detected_msg'));
      return;
    }

    try {
      const payloadLandmarks = { landmark: landmarks };
      const res = await trainingService.startStaticCollection(label, datasetName, payloadLandmarks);

      console.log("RESPOSTA DA API: ", res);

      if (res.ok) {
        setSampleCount(res.sample_count);
        // Visual feeback removed Alert.alert to not block fast clicking, but added to state maybe
      } else {
        const errorMsg = res.error || (res.detail ? JSON.stringify(res.detail) : JSON.stringify(res));
        Alert.alert(t('collect_static.api_error'), errorMsg || t('collect_static.api_error'));
      }
    } catch (e) {
      Alert.alert(t('collect_static.network_error'), t('collect_static.network_error') + ": " + String(e));
    }
  };

  const finalizeDataset = () => {
    Alert.alert(
      t('collect_static.success_title'),
      t('collect_static.success_msg', { label, count: sampleCount, datasetName }),
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
        <Text style={styles.title}>{t('collect_static.title')}</Text>
      </View>

      <View style={[styles.cameraContainer, { width: CAM_WIDTH, height: CAM_HEIGHT }]}>
        {device ? (
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={true}
            pixelFormat="rgb"
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
              return <View key={idx} style={[styles.landmarkDot, { left: dotX, top: dotY }]} />;
            })}
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
              placeholder="EX: ALFABETO_V1"
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
            placeholder="EX: A"
            value={label}
            autoCapitalize="characters"
            autoCorrect={false}
            onChangeText={(v) => {
              setLabel(v);
              // Verifica se o label jÃ¡ existe no dataset atual
              const normalized = v.toUpperCase();
              if (normalized && gestureLabels.includes(normalized)) {
                setLabelHint(t('collect_static.label_hint', { normalized }));
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
            <TouchableOpacity style={styles.captureBtn} onPress={captureStatic}>
              <MaterialIcons name="camera" size={24} color="#000" />
              <Text style={styles.captureBtnText}>{t('collect_static.capture_btn')}</Text>
            </TouchableOpacity>

            {sampleCount > 0 && (
              <TouchableOpacity style={styles.finalizeBtn} onPress={finalizeDataset}>
                <MaterialIcons name="check-circle" size={24} color="#fff" />
                <Text style={styles.finalizeBtnText}>{t('collect_static.finalize_btn')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.stats}>
            {t('collect_static.stats', { label, count: sampleCount })}
          </Text>
          </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}




