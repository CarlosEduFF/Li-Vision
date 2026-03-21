  import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
  import { useEffect, useState } from "react";
  import { setRunMode, setDetectionMode, getState } from "@/services/api";

  export default function SettingsScreen() {

    const [runMode, setRunModeState] = useState<string>("...");
    const [detectionMode, setDetectionModeState] = useState<string>("...");

    async function loadState() {

      try {

        const data = await getState();

        setRunModeState(data.run_mode);
        setDetectionModeState(data.detection?.mode);

      } catch (e) {

        console.log("Erro ao carregar estado da API", e);

      }

    }

    useEffect(() => {
      loadState();
    }, []);

  async function changeRunMode(mode: string) {
    try {
      await setRunMode(mode);
      setRunModeState(mode);
    } catch (e) {
      console.log("Erro ao mudar run mode", e);
    }
  }
    async function changeDetection(mode: string) {

      await setDetectionMode(mode);

      setDetectionModeState(mode);

    }

    return (

      <View style={styles.container}>

        <Text style={styles.title}>
          Configuração da API
        </Text>

        <View style={styles.statusCard}>

          <Text style={styles.statusText}>
            Run Mode: {runMode}
          </Text>

          <Text style={styles.statusText}>
            Detection: {detectionMode}
          </Text>

        </View>

        <View style={styles.card}>

          <Text style={styles.sectionTitle}>
            Modo da Aplicação
          </Text>

          <TouchableOpacity
            style={styles.option}
            onPress={() => changeRunMode("collect")}
          >
            <Text style={styles.optionText}>
              Coleta de Dados
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={() => changeRunMode("train")}
          >
            <Text style={styles.optionText}>
              Treinar Modelo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={() => changeRunMode("inference")}
          >
            <Text style={styles.optionText}>
              Inferência
            </Text>
          </TouchableOpacity>

        </View>

        <View style={styles.card}>

          <Text style={styles.sectionTitle}>
            Modo de Detecção
          </Text>

          <TouchableOpacity
            style={styles.option}
            onPress={() => changeDetection("rules")}
          >
            <Text style={styles.optionText}>
              Regras
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={() => changeDetection("ml")}
          >
            <Text style={styles.optionText}>
              Machine Learning
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={() => changeDetection("dynamic_ml")}
          >
            <Text style={styles.optionText}>
              Dinâmico
            </Text>
          </TouchableOpacity>

        </View>

      </View>
    );
  }

  const styles = StyleSheet.create({

    container: {
      flex: 1,
      padding: 20,
      backgroundColor: "#F4F6F8"
    },

    title: {
      fontSize: 28,
      fontWeight: "bold",
      marginBottom: 20
    },

    statusCard: {
      backgroundColor: "#222",
      padding: 16,
      borderRadius: 12,
      marginBottom: 20
    },

    statusText: {
      color: "white",
      fontSize: 16,
      marginBottom: 4
    },

    card: {
      backgroundColor: "white",
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 10
    },

    sectionTitle: {
      fontSize: 20,
      fontWeight: "bold",
      marginBottom: 10
    },

    option: {
      padding: 14,
      backgroundColor: "#00AEEF",
      borderRadius: 10,
      marginTop: 10
    },

    optionText: {
      color: "white",
      fontSize: 16
    }

  });