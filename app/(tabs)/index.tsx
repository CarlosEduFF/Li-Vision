import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Treinamento de Libras</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/screens/cam")}
      >
        <Text style={styles.buttonText}>Iniciar câmera</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, justifyContent:"center", alignItems:"center" },
  title: { fontSize:24, marginBottom:20 },
  button: { backgroundColor:"#4A90E2", padding:15, borderRadius:10 },
  buttonText: { color:"#fff", fontSize:16 }
});