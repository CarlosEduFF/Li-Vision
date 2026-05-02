import { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Dimensions, Alert, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trainingService } from "../../services/trainingService";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Camera, useCameraDevice, useFrameProcessor } from "react-native-vision-camera";
import { Worklets } from "react-native-worklets-core";
import { detectHandLandmarks, LandmarkPoint } from "@/services/handLandmarkerPlugin";
import { gestureWS } from "@/services/gestureWebSocket";

export default function CollectDynamicScreen() {
  const [label, setLabel] = useState("");
  const [datasetName, setDatasetName] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(isRecording);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [sequences, setSequences] = useState(0);
  const [landmarks, setLandmarks] = useState<LandmarkPoint[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [gestureLabels, setGestureLabels] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [labelHint, setLabelHint] = useState<string | null>(null);

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
      Alert.alert("Aviso", "Preencha Nome e Label");
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
           Alert.alert("Tempo Esgotado", "Não foi possível detectar as mãos ou focar as 15 frames suficientes a tempo. Tente novamente focando a mão.");
        }
      }, 6000);
    } catch (e) {
      Alert.alert("Erro na Gravação", String(e));
      setIsRecording(false);
    }
  };

  const finalizeDataset = () => {
    Alert.alert(
      "Sucesso!",
      `Massa! Coleta de sinais de "${label}" finalizada. Salvo ${sequences} sequências dinâmicas no banco de dados para o dataset ${datasetName}.`,
      [{ text: "OK", onPress: () => router.back() }]
    );
  };

  const CAM_WIDTH = screenWidth - 32;
  const CAM_HEIGHT = 280;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={28} color="#00e5ff" />
        </TouchableOpacity>
        <Text style={styles.title}>Coleta Dinâmica</Text>
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
            <Text style={{ color: "#888" }}>Aguardando câmera...</Text>
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
            <Text style={styles.recordingText}>GRAVANDO...</Text>
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
          <Text style={styles.label}>Dataset Nome</Text>

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
            datasets.length === 0 && <Text style={{ color: "#888" }}>Nenhum dataset disponível</Text>
          )}

          <Text style={styles.label}>Label (Gesto)</Text>
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

          {isAdmin ? (
            <>
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
                    setLabelHint(
                      `O gesto "${normalized}" já existe neste dataset. ` +
                      `Gravar adicionará mais sequências a ele.`
                    );
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
            </>
          ) : (
            gestureLabels.length === 0 && datasetName && <Text style={{ color: "#888" }}>Nenhum gesto cadastrado pelo Admin para este dataset.</Text>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.captureBtn, isRecording && { backgroundColor: '#333' }]}
              onPress={startDynamic}
              disabled={isRecording}
            >
              <MaterialIcons name={isRecording ? "radio-button-checked" : "fiber-manual-record"} size={24} color={isRecording ? "red" : "#000"} />
              <Text style={[styles.captureBtnText, isRecording && { color: "#888" }]}>
                {isRecording ? "Gravando Sequência..." : "Gravar Sequência"}
              </Text>
            </TouchableOpacity>

            {sequences > 0 && !isRecording && (
              <TouchableOpacity style={styles.finalizeBtn} onPress={finalizeDataset}>
                <MaterialIcons name="check-circle" size={24} color="#fff" />
                <Text style={styles.finalizeBtnText}>Finalizar Coleta</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.stats}>
            Sequências gravadas: {sequences}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#10141a", padding: 20, paddingTop: 50 },
  header: { flexDirection: "row", alignItems: "center", gap: 15, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  cameraContainer: { backgroundColor: "#1c2026", borderRadius: 15, overflow: "hidden", position: "relative", marginBottom: 20 },
  permissionBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  landmarkDot: { position: "absolute", width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#00e5ff" },
  recordingOverlay: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 10, gap: 5 },
  recordingText: { color: "red", fontWeight: "bold", fontSize: 12 },
  form: { gap: 15 },
  label: { color: "#888", fontSize: 14, fontWeight: "bold" },
  input: { backgroundColor: "#1c2026", color: "#00e5ff", padding: 15, borderRadius: 10, borderWidth: 1, borderColor: "rgba(0, 229, 255, 0.3)", fontSize: 18, fontWeight: "bold" },
  buttonRow: { flexDirection: "column", gap: 10, marginTop: 10 },
  captureBtn: { backgroundColor: "#00e5ff", flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 15, borderRadius: 10, gap: 10 },
  captureBtnText: { color: "#000", fontWeight: "bold", fontSize: 16 },
  finalizeBtn: { backgroundColor: "#4caf50", flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 15, borderRadius: 10, gap: 10 },
  finalizeBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  stats: { color: "#888", textAlign: "center", marginTop: 10 },
  chipScroll: { marginBottom: 10 },
  chip: { backgroundColor: "#262a31", paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: "transparent" },
  chipActive: { borderColor: "#00e5ff", backgroundColor: "rgba(0, 229, 255, 0.15)" },
  chipText: { color: "#888", fontWeight: "bold" },
  chipTextActive: { color: "#00e5ff" },
  labelHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 171, 0, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 171, 0, 0.2)",
    borderRadius: 10,
    padding: 12,
    marginTop: -5,
  },
  labelHintText: {
    color: "#ffab00",
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
});
