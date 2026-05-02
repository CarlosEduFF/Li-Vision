import { detectHandLandmarks, LandmarkPoint } from "@/services/handLandmarkerPlugin";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Dimensions, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Camera, useCameraDevice, useFrameProcessor } from "react-native-vision-camera";
import { Worklets } from "react-native-worklets-core";
import { trainingService } from "../../services/trainingService";

export default function CollectStaticScreen() {
  const [label, setLabel] = useState("");
  const [datasetName, setDatasetName] = useState("");
  const [sampleCount, setSampleCount] = useState(0);
  const [landmarks, setLandmarks] = useState<LandmarkPoint[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [gestureLabels, setGestureLabels] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [labelHint, setLabelHint] = useState<string | null>(null);

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
  const transformPoint = (lm: any) => ({ x: 1.0 - lm.y, y: 1.0 - lm.x, z: lm.z });

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
      Alert.alert("Aviso", "Preencha Nome e Label");
      return;
    }
    if (landmarks.length < 21) {
      Alert.alert("✋ Ops", "Coloque a mão na tela para ser detectada antes de capturar");
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
        Alert.alert("Erro da API", errorMsg || "Ocorreu um problema ao salvar");
      }
    } catch (e) {
      Alert.alert("Erro de Rede", "Backend não respondeu corretamente: " + String(e));
    }
  };

  const finalizeDataset = () => {
    Alert.alert(
      "Sucesso!",
      `Massa! Coleta de "${label}" finalizada. Salvo ${sampleCount} amostras no banco de dados para o dataset ${datasetName}.`,
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
        <Text style={styles.title}>Coleta Estática</Text>
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
              placeholder="EX: ALFABETO_V1"
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
                placeholder="EX: A"
                value={label}
                autoCapitalize="characters"
                autoCorrect={false}
                onChangeText={(v) => {
                  setLabel(v);
                  // Verifica se o label já existe no dataset atual
                  const normalized = v.toUpperCase();
                  if (normalized && gestureLabels.includes(normalized)) {
                    setLabelHint(
                      `O gesto "${normalized}" já existe neste dataset. ` +
                      `Capturar adicionará mais amostras a ele.`
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
            <TouchableOpacity style={styles.captureBtn} onPress={captureStatic}>
              <MaterialIcons name="camera" size={24} color="#000" />
              <Text style={styles.captureBtnText}>Capturar Frame</Text>
            </TouchableOpacity>

            {sampleCount > 0 && (
              <TouchableOpacity style={styles.finalizeBtn} onPress={finalizeDataset}>
                <MaterialIcons name="check-circle" size={24} color="#fff" />
                <Text style={styles.finalizeBtnText}>Finalizar Coleta</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.stats}>
            Amostras coletadas para "{label}": {sampleCount}
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
