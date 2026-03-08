import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { setRunMode, setDetectionMode } from "@/services/api";

export default function SettingsScreen() {

  return (

    <View style={styles.container}>

      <Text style={styles.title}>
        Configuração da API
      </Text>

      <View style={styles.card}>

        <Text style={styles.sectionTitle}>
          Modo da Aplicação
        </Text>

        <TouchableOpacity
          style={styles.option}
          onPress={() => setRunMode("collect")}
        >
          <Text style={styles.optionText}>
            Coleta de Dados
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.option}
          onPress={() => setRunMode("train")}
        >
          <Text style={styles.optionText}>
            Treinar Modelo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.option}
          onPress={() => setRunMode("inference")}
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
          onPress={() => setDetectionMode("rules")}
        >
          <Text style={styles.optionText}>
            Regras
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.option}
          onPress={() => setDetectionMode("ml")}
        >
          <Text style={styles.optionText}>
            Machine Learning
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.option}
          onPress={() => setDetectionMode("dynamic_ml")}
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