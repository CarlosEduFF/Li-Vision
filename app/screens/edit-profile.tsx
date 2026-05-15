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
import { useTranslation } from "react-i18next";

export default function EditProfileScreen() {
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const { t } = useTranslation();

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
      Alert.alert(t('edit_profile.permission_gallery_title'), t('edit_profile.permission_gallery_msg'));
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
      Alert.alert(t('edit_profile.permission_camera_title'), t('edit_profile.permission_camera_msg'));
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

  const handleSaveChanges = async () => {
    if (!fullName.trim()) {
      Alert.alert(t('edit_profile.warning'), t('edit_profile.empty_name'));
      return;
    }

    setSaving(true);
    try {
      let nameSuccess = false;
      let photoSuccess = false;

      // 1. Atualizar Nome
      const resName = await trainingService.updateProfile(fullName.trim());
      if (resName.ok) {
        await AsyncStorage.setItem("userName", resName.full_name);
        nameSuccess = true;
      } else {
        Alert.alert(t('edit_profile.error'), resName.detail || t('edit_profile.update_name_fail'));
        setSaving(false);
        return;
      }

      // 2. Atualizar Foto (se escolhida)
      if (localImageUri) {
        setUploadingPhoto(true);
        const resPhoto = await trainingService.uploadAvatar(localImageUri);
        if (resPhoto.ok && resPhoto.avatar_url) {
          setAvatarUrl(resPhoto.avatar_url);
          setLocalImageUri(null);
          await AsyncStorage.setItem("userAvatar", resPhoto.avatar_url);
          photoSuccess = true;
        } else {
          Alert.alert(t('edit_profile.error'), resPhoto.detail || t('edit_profile.update_photo_fail'));
        }
        setUploadingPhoto(false);
      }

      if (nameSuccess && !localImageUri) {
        Alert.alert(t('edit_profile.success'), t('edit_profile.success_profile'));
      } else if (nameSuccess && photoSuccess) {
        Alert.alert(t('edit_profile.success'), t('edit_profile.success_both'));
      }
    } catch (e) {
      Alert.alert(t('edit_profile.network_error'), t('edit_profile.network_error_msg') + String(e));
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
          <Text style={styles.headerTitle}>{t('edit_profile.title')}</Text>
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
                  t('edit_profile.change_photo'),
                  t('edit_profile.choose_source'),
                  [
                    { text: t('edit_profile.camera'), onPress: takePhoto },
                    { text: t('edit_profile.gallery'), onPress: pickImage },
                    { text: t('edit_profile.cancel'), style: "cancel" },
                  ]
                );
              }}
            >
              <MaterialIcons name="camera-alt" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Form */}
        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>{t('edit_profile.full_name')}</Text>
          <View style={styles.inputRow}>
            <MaterialIcons name="person" size={20} color="#555" />
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder={t('edit_profile.name_placeholder')}
              placeholderTextColor="#444"
              autoCapitalize="words"
            />
          </View>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSaveChanges}
            disabled={saving || uploadingPhoto}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <MaterialIcons name="save" size={20} color="#000" />
                <Text style={styles.saveBtnText}>{t('edit_profile.save')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <MaterialIcons name="info-outline" size={18} color="#ffab00" />
          <Text style={styles.infoText}>
            {t('edit_profile.info')}
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
