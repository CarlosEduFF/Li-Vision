import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Image, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { trainingService } from "@/services/trainingService";

export default function EditProfileScreen() {
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      // Primeiro tenta carregar do AsyncStorage (cached)
      const name = await AsyncStorage.getItem("userName");
      const avatar = await AsyncStorage.getItem("userAvatar");
      if (name) setFullName(name);
      if (avatar) setAvatarUrl(avatar);

      // Depois busca os dados frescos do servidor
      const res = await trainingService.getProfile();
      if (res.ok && res.profile) {
        setFullName(res.profile.full_name || "");
        setAvatarUrl(res.profile.avatar_url || null);
      }
    } catch (e) {
      console.log("Erro ao carregar perfil:", e);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert("Permissão necessária", "Precisamos de acesso à sua galeria para selecionar uma foto.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setLocalImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert("Permissão necessária", "Precisamos de acesso à câmera para tirar uma foto.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setLocalImageUri(result.assets[0].uri);
    }
  };

  const handleUploadAvatar = async () => {
    if (!localImageUri) return;

    setUploadingPhoto(true);
    try {
      const res = await trainingService.uploadAvatar(localImageUri);
      if (res.ok && res.avatar_url) {
        setAvatarUrl(res.avatar_url);
        setLocalImageUri(null);
        await AsyncStorage.setItem("userAvatar", res.avatar_url);
        Alert.alert("✅ Foto atualizada!", "Sua foto de perfil foi salva com sucesso.");
      } else {
        Alert.alert("Erro", res.detail || "Falha ao enviar a foto.");
      }
    } catch (e) {
      Alert.alert("Erro de rede", "Não foi possível enviar a foto: " + String(e));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveName = async () => {
    if (!fullName.trim()) {
      Alert.alert("Aviso", "O nome não pode estar vazio.");
      return;
    }

    setSaving(true);
    try {
      const res = await trainingService.updateProfile(fullName.trim());
      if (res.ok) {
        await AsyncStorage.setItem("userName", res.full_name);
        Alert.alert("✅ Nome atualizado!", `Seu nome agora é "${res.full_name}".`);
      } else {
        Alert.alert("Erro", res.detail || "Falha ao atualizar o nome.");
      }
    } catch (e) {
      Alert.alert("Erro de rede", "Não foi possível salvar: " + String(e));
    } finally {
      setSaving(false);
    }
  };

  const displayImage = localImageUri || avatarUrl;

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#00e5ff" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editar Perfil</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {displayImage ? (
              <Image
                source={{ uri: displayImage }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <MaterialIcons name="person" size={60} color="#555" />
              </View>
            )}

            {/* Badge de edição */}
            <TouchableOpacity
              style={styles.editBadge}
              onPress={() => {
                Alert.alert(
                  "Alterar Foto",
                  "Escolha de onde deseja pegar a foto",
                  [
                    { text: "📷 Câmera", onPress: takePhoto },
                    { text: "🖼️ Galeria", onPress: pickImage },
                    { text: "Cancelar", style: "cancel" },
                  ]
                );
              }}
            >
              <MaterialIcons name="camera-alt" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {localImageUri && (
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={handleUploadAvatar}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  <MaterialIcons name="cloud-upload" size={20} color="#000" />
                  <Text style={styles.uploadBtnText}>Enviar Nova Foto</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Form */}
        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>Nome Completo</Text>
          <View style={styles.inputRow}>
            <MaterialIcons name="person" size={20} color="#555" />
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Seu nome completo"
              placeholderTextColor="#444"
              autoCapitalize="words"
            />
          </View>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSaveName}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <MaterialIcons name="save" size={20} color="#000" />
                <Text style={styles.saveBtnText}>Salvar Alterações</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <MaterialIcons name="info-outline" size={18} color="#ffab00" />
          <Text style={styles.infoText}>
            A foto de perfil será armazenada na nuvem do Supabase e ficará visível para outros usuários no ranking.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#10141a",
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#1c2026",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
  },
  // Avatar
  avatarSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#00e5ff",
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#1c2026",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(0, 229, 255, 0.3)",
    borderStyle: "dashed",
  },
  editBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#00e5ff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#10141a",
    shadowColor: "#00e5ff",
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#00e5ff",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: "#00e5ff",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  uploadBtnText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 14,
  },
  // Form
  formCard: {
    backgroundColor: "#1c2026",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.15)",
  },
  fieldLabel: {
    color: "#888",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#0b0e14",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    color: "#00e5ff",
    fontSize: 16,
    paddingVertical: 16,
    fontWeight: "600",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#00e5ff",
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: "#00e5ff",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  saveBtnText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 16,
  },
  // Info
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(255, 171, 0, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 171, 0, 0.2)",
    borderRadius: 14,
    padding: 16,
  },
  infoText: {
    fontSize: 13,
    color: "#aaa",
    flex: 1,
    lineHeight: 19,
  },
});
