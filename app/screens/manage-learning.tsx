import {
  createLearningGesture,
  deleteLearningGesture,
  getLearningGestures,
  LearningGestureApi,
  updateLearningGesture,
} from "@/services/api";
import { LearningLevel } from "@/services/learningService";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { uploadLearningImage } from "@/services/api";

type FormState = {
  id?: string;
  name: string;
  level: LearningLevel;
  category: string;
  module: string;
  description: string;
  svg_initial: string;
  svg_movement: string;
  svg_final: string;
};

const initialForm: FormState = {
  name: "",
  level: "iniciante",
  category: "Alfabeto",
  module: "Libras",
  description: "",
  svg_initial: "",
  svg_movement: "",
  svg_final: "",
};

export default function ManageLearningScreen() {
  const router = useRouter();
  const [crudItems, setCrudItems] = useState<LearningGestureApi[]>([]);
  const [loadingCrud, setLoadingCrud] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const { t } = useTranslation();

  useFocusEffect(
    useCallback(() => {
      loadCrudList();
    }, [])
  );

  const loadCrudList = async () => {
    try {
      setLoadingCrud(true);
      const res = await getLearningGestures({ include_inactive: true });
      setCrudItems(res.items || []);
    } catch (error: any) {
      Alert.alert(t('manage_learning.success_title'), error?.message || t('manage_learning.error_load'));
    } finally {
      setLoadingCrud(false);
    }
  };

  const openCreate = () => {
    setForm(initialForm);
    setModalVisible(true);
  };

  const openEdit = (item: LearningGestureApi) => {
    setForm({
      id: item.id,
      name: item.name,
      level: item.level as LearningLevel,
      category: item.category,
      module: item.module || "Libras",
      description: item.description,
      svg_initial: item.svg_initial || "",
      svg_movement: item.svg_movement || "",
      svg_final: item.svg_final || "",
    });
    setModalVisible(true);
  };

  const saveGesture = async () => {
    if (!form.name.trim()) {
      Alert.alert(t('manage_learning.validation_title'), t('manage_learning.name_required'));
      return;
    }
    if (!form.category.trim()) {
      Alert.alert(t('manage_learning.validation_title'), t('manage_learning.category_required'));
      return;
    }

    try {
      setSaving(true);
      
      let finalInitial = form.svg_initial;
      let finalMovement = form.svg_movement;
      let finalFinal = form.svg_final;
      
      // Se a string contiver 'file://' (ou não for uma URL http), enviamos o upload
      if (finalInitial && !finalInitial.startsWith("http")) {
        const up = await uploadLearningImage(finalInitial);
        if (up.ok) finalInitial = up.url;
      }
      if (finalMovement && !finalMovement.startsWith("http")) {
        const up = await uploadLearningImage(finalMovement);
        if (up.ok) finalMovement = up.url;
      }
      if (finalFinal && !finalFinal.startsWith("http")) {
        const up = await uploadLearningImage(finalFinal);
        if (up.ok) finalFinal = up.url;
      }
      
      const payload = {
        name: form.name.trim(),
        level: form.level,
        category: form.category.trim(),
        module: form.module.trim() || "Libras",
        description: form.description.trim(),
        svg_initial: finalInitial,
        svg_movement: finalMovement,
        svg_final: finalFinal,
        is_active: true,
      };

      if (form.id) {
        await updateLearningGesture(form.id, payload);
      } else {
        await createLearningGesture(payload);
      }

      setModalVisible(false);
      setForm(initialForm);
      await loadCrudList();
      Alert.alert(t('manage_learning.success_title'), form.id ? t('manage_learning.gesture_updated') : t('manage_learning.gesture_created'));
    } catch (error: any) {
      Alert.alert(t('manage_learning.success_title'), error?.message || t('manage_learning.save_error'));
    } finally {
      setSaving(false);
    }
  };

  const pickImageFor = async (field: "svg_initial" | "svg_movement" | "svg_final") => {
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert(t('manage_learning.permission_title'), t('manage_learning.gallery_permission'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setForm((prev) => ({ ...prev, [field]: result.assets[0].uri }));
    }
  };

  const removeGesture = (item: LearningGestureApi) => {
    Alert.alert(
      t('manage_learning.delete_title'),
      t('manage_learning.delete_msg', { name: item.name }),
      [
        { text: t('manage_learning.cancel'), style: "cancel" },
        {
          text: t('manage_learning.delete'),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteLearningGesture(item.id);
              await loadCrudList();
            } catch (error: any) {
              Alert.alert(t('manage_learning.success_title'), error?.message || t('manage_learning.delete_error'));
            }
          },
        },
      ]
    );
  };

  const nextLevel = () => {
    if (form.level === "iniciante") return "intermediario";
    if (form.level === "intermediario") return "avancado";
    return "iniciante";
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#00e5ff" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{t('manage_learning.title')}</Text>
          <Text style={styles.subtitle}>{t('manage_learning.subtitle')}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <MaterialIcons name="add" size={20} color="#081018" />
          <Text style={styles.addBtnText}>{t('manage_learning.new_gesture')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loadingCrud ? (
          <Text style={styles.emptyText}>{t('manage_learning.loading_gestures')}</Text>
        ) : crudItems.length === 0 ? (
          <Text style={styles.emptyText}>{t('manage_learning.no_gestures')}</Text>
        ) : (
          crudItems.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardLeft}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>
                   {t(`levels_simple.${item.level}`).toUpperCase()} • {item.module} • {item.category}
                </Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(item)}>
                  <MaterialIcons name="edit" size={20} color="#c7d0de" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconBtn, styles.deleteBtn]} onPress={() => removeGesture(item)}>
                  <MaterialIcons name="delete" size={20} color="#ff8686" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalBg}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{form.id ? t('manage_learning.edit_gesture') : t('manage_learning.new_gesture_modal')}</Text>

            <Text style={styles.inputLabel}>{t('manage_learning.gesture_name')}</Text>
            <TextInput
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              style={styles.input}
              placeholder={t('manage_learning.name_placeholder')}
              placeholderTextColor="#697688"
            />

            <Text style={styles.inputLabel}>{t('manage_learning.category')}</Text>
            <TextInput
              value={form.category}
              onChangeText={(v) => setForm((f) => ({ ...f, category: v }))}
              style={styles.input}
              placeholder={t('manage_learning.category_placeholder')}
              placeholderTextColor="#697688"
            />

            <Text style={styles.inputLabel}>{t('manage_learning.module') || "Módulo / Idioma"}</Text>
            <TextInput
              value={form.module}
              onChangeText={(v) => setForm((f) => ({ ...f, module: v }))}
              style={styles.input}
              placeholder="Ex: Libras, ASL, Cozinha..."
              placeholderTextColor="#697688"
            />

            <Text style={styles.inputLabel}>{t('manage_learning.description')}</Text>
            <TextInput
              value={form.description}
              onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
              style={[styles.input, { height: 76 }]}
              multiline
              placeholder={t('manage_learning.description_placeholder')}
              placeholderTextColor="#697688"
            />

            <Text style={styles.inputLabel}>{t('manage_learning.difficulty_level')}</Text>
            <TouchableOpacity
              style={styles.levelPicker}
              onPress={() => setForm((f) => ({ ...f, level: nextLevel() }))}>
              <Text style={styles.levelPickerText}>{t(`levels_simple.${form.level}`).toUpperCase()}</Text>
              <MaterialIcons name="swap-horiz" size={20} color="#00e5ff" />
            </TouchableOpacity>

            <Text style={styles.inputLabel}>{t('manage_learning.images_label')}</Text>
            <View style={styles.imagesRow}>
              <TouchableOpacity style={styles.imageBox} onPress={() => pickImageFor("svg_initial")}>
                {form.svg_initial ? (
                  <Image source={{ uri: form.svg_initial }} style={styles.previewImage} />
                ) : (
                  <MaterialIcons name="pan-tool" size={24} color="#697688" />
                )}
                <Text style={styles.imageBoxText}>{t('manage_learning.initial')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.imageBox} onPress={() => pickImageFor("svg_movement")}>
                {form.svg_movement ? (
                  <Image source={{ uri: form.svg_movement }} style={styles.previewImage} />
                ) : (
                  <MaterialIcons name="gesture" size={24} color="#697688" />
                )}
                <Text style={styles.imageBoxText}>{t('manage_learning.movement')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.imageBox} onPress={() => pickImageFor("svg_final")}>
                {form.svg_final ? (
                  <Image source={{ uri: form.svg_final }} style={styles.previewImage} />
                ) : (
                  <MaterialIcons name="front-hand" size={24} color="#697688" />
                )}
                <Text style={styles.imageBoxText}>{t('manage_learning.final')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>{t('manage_learning.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={saveGesture}
                disabled={saving}>
                <Text style={styles.saveText}>{saving ? t('manage_learning.saving') : t('manage_learning.save_btn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#10141a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1c2026",
    backgroundColor: "#151a22",
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: "#1c2026",
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    color: "#8a92a3",
    fontSize: 12,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#00e5ff",
  },
  addBtnText: {
    color: "#081018",
    fontWeight: "700",
    fontSize: 13,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  emptyText: {
    color: "#8a92a3",
    textAlign: "center",
    marginTop: 40,
    fontSize: 15,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#1c2026",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#283345",
  },
  cardLeft: {
    flex: 1,
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  cardSubtitle: {
    color: "#9cadc3",
    fontSize: 13,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#2a3548",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    backgroundColor: "rgba(255, 134, 134, 0.1)",
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(5,8,12,0.8)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#121821",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#283345",
    maxHeight: "85%",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 20,
  },
  inputLabel: {
    color: "#9cadc3",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#1a2230",
    borderWidth: 1,
    borderColor: "#2a3548",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#ffffff",
    fontSize: 15,
  },
  levelPicker: {
    marginTop: 2,
    backgroundColor: "#1a2230",
    borderWidth: 1,
    borderColor: "#2a3548",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  levelPickerText: {
    color: "#eaf0fa",
    fontWeight: "700",
    fontSize: 15,
  },
  modalActions: {
    marginTop: 24,
    flexDirection: "row",
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#3a475c",
  },
  saveBtn: {
    backgroundColor: "#00e5ff",
  },
  cancelText: {
    color: "#d4ddeb",
    fontWeight: "700",
    fontSize: 15,
  },
  saveText: {
    color: "#081018",
    fontWeight: "800",
    fontSize: 15,
  },
  imagesRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  imageBox: {
    flex: 1,
    height: 80,
    backgroundColor: "#1a2230",
    borderWidth: 1,
    borderColor: "#2a3548",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
    opacity: 0.8,
  },
  imageBoxText: {
    color: "#eaf0fa",
    fontSize: 11,
    marginTop: 4,
    fontWeight: "bold",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 4,
    borderRadius: 4,
  },
});
