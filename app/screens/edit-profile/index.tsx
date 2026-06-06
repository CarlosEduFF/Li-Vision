import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, TextInput,
  Image, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { trainingService } from "@/services/trainingService";
import { useTranslation } from "react-i18next";
import { editProfileStyles as styles } from "@/styles/edit-profile.styles";

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

            {/* Badge de ediÃ§Ã£o */}
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

