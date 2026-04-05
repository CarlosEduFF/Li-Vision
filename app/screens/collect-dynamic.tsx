import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { useState } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { trainingService } from "../../services/trainingService";
import { router } from "expo-router";

// Fake UI
export default function CollectDynamicScreen() {
  const [label, setLabel] = useState("");
  const [datasetName, setDatasetName] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [sequences, setSequences] = useState(0);

  const startDynamic = async () => {
    if (!label || !datasetName) return;
    try {
      setIsRecording(true);
      await trainingService.startDynamicCollection(label, datasetName);
      // Faked timeout until websocket handles "done" logic locally
      setTimeout(async () => {
        const res = await trainingService.stopDynamicCollection();
        setIsRecording(false);
        setSequences(s => s + 1);
      }, 3000);
    } catch (e) {
      console.log("Erro capture dynamic:", e);
      setIsRecording(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={28} color="#00e5ff" />
        </TouchableOpacity>
        <Text style={styles.title}>Coleta Dinâmica</Text>
      </View>

      <View style={styles.camPlaceholder}>
        <Text style={{color:"#888"}}>Live Camera View...</Text>
        {isRecording && <Text style={{color:"red", fontWeight:"bold", marginTop:20}}>GRAVANDO (15 frames)...</Text>}
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Dataset Nome</Text>
        <TextInput 
          style={styles.input}
          placeholderTextColor="#666"
          placeholder="EX: LIBRAS_V1"
          value={datasetName}
          onChangeText={(v) => setDatasetName(v.toUpperCase())}
        />
        
        <Text style={styles.label}>Label (Gesto)</Text>
        <TextInput 
          style={styles.input}
          placeholderTextColor="#666"
          placeholder="EX: OI"
          value={label}
          onChangeText={(v) => setLabel(v.toUpperCase())}
        />

        <TouchableOpacity 
          style={[styles.captureBtn, isRecording && {backgroundColor: '#333'}]} 
          onPress={startDynamic}
          disabled={isRecording}
        >
          <MaterialIcons name={isRecording ? "radio-button-checked" : "fiber-manual-record"} size={24} color={isRecording ? "red" : "#000"} />
          <Text style={[styles.captureBtnText, isRecording && {color: "#888"}]}>
            {isRecording ? "Gravando..." : "Gravar Sequência"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.stats}>
          Sequências gravadas: {sequences}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#10141a", padding: 20, paddingTop: 50 },
  header: { flexDirection: "row", alignItems: "center", gap: 15, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  camPlaceholder: { height: 250, backgroundColor: "#1c2026", borderRadius: 15, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  form: { gap: 15 },
  label: { color: "#888", fontSize: 14, fontWeight:"bold" },
  input: { backgroundColor: "#1c2026", color: "#00e5ff", padding: 15, borderRadius: 10, borderWidth: 1, borderColor: "rgba(0, 229, 255, 0.3)", fontSize: 18, fontWeight: "bold" },
  captureBtn: { backgroundColor: "#00e5ff", flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 15, borderRadius: 10, gap: 10, marginTop:10 },
  captureBtnText: { color: "#000", fontWeight: "bold", fontSize: 16 },
  stats: { color: "#888", textAlign: "center", marginTop: 10 }
});
