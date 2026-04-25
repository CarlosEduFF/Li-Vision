import {
  createLearningGesture,
  deleteLearningGesture,
  getLearningGestures,
  LearningGestureApi,
  updateLearningGesture,
} from "@/services/api";
import {
  getLevelProgress,
  LearningLevel,
  LEVEL_META,
} from "@/services/learningService";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type LevelCard = {
  key: LearningLevel;
  icon: keyof typeof MaterialIcons.glyphMap;
};

type LevelProgress = { total: number; learned: number; percent: number };

const LEVELS: LevelCard[] = [
  { key: "iniciante", icon: "looks-one" },
  { key: "intermediario", icon: "looks-two" },
  { key: "avancado", icon: "looks-3" },
];

type FormState = {
  id?: string;
  name: string;
  level: LearningLevel;
  category: string;
  description: string;
};

const initialForm: FormState = {
  name: "",
  level: "iniciante",
  category: "Alfabeto",
  description: "",
};

export default function LearnTabScreen() {
  const router = useRouter();
  const [progress, setProgress] = useState<Record<LearningLevel, LevelProgress>>({
    iniciante: { total: 0, learned: 0, percent: 0 },
    intermediario: { total: 0, learned: 0, percent: 0 },
    avancado: { total: 0, learned: 0, percent: 0 },
  });

  const [role, setRole] = useState<string>("member");
  const [crudItems, setCrudItems] = useState<LearningGestureApi[]>([]);
  const [loadingCrud, setLoadingCrud] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);

  const isAdmin = useMemo(() => role === "admin", [role]);

  useEffect(() => {
    const load = async () => {
      const [i, m, a] = await Promise.all([
        getLevelProgress("iniciante"),
        getLevelProgress("intermediario"),
        getLevelProgress("avancado"),
      ]);
      setProgress({
        iniciante: i,
        intermediario: m,
        avancado: a,
      });
    };
    load();
  }, []);

  useEffect(() => {
    const loadRole = async () => {
      const storedRole = await AsyncStorage.getItem("userRole");
      setRole(storedRole || "member");
    };
    loadRole();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadCrudList();
  }, [isAdmin]);

  const loadCrudList = async () => {
    try {
      setLoadingCrud(true);
      const res = await getLearningGestures({ include_inactive: true });
      setCrudItems(res.items || []);
    } catch (error: any) {
      Alert.alert("Erro", error?.message || "Não foi possível carregar gestos para edição.");
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
      level: item.level,
      category: item.category,
      description: item.description,
    });
    setModalVisible(true);
  };

  const saveGesture = async () => {
    if (!form.name.trim()) {
      Alert.alert("Validação", "Informe o nome do gesto.");
      return;
    }
    if (!form.category.trim()) {
      Alert.alert("Validação", "Informe a categoria.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        level: form.level,
        category: form.category.trim(),
        description: form.description.trim(),
        svg_initial: "",
        svg_movement: "",
        svg_final: "",
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
      Alert.alert("Sucesso", form.id ? "Gesto atualizado." : "Gesto criado.");
    } catch (error: any) {
      Alert.alert("Erro", error?.message || "Falha ao salvar gesto.");
    } finally {
      setSaving(false);
    }
  };

  const removeGesture = (item: LearningGestureApi) => {
    Alert.alert(
      "Excluir gesto",
      `Deseja excluir "${item.name}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteLearningGesture(item.id);
              await loadCrudList();
            } catch (error: any) {
              Alert.alert("Erro", error?.message || "Falha ao excluir gesto.");
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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Aprendizagem</Text>
          <Text style={styles.subtitle}>
            Aprenda Libras com foco no alfabeto, de forma progressiva para crianças e adultos.
          </Text>
        </View>

        {LEVELS.map((item) => {
          const meta = LEVEL_META[item.key];
          const p = progress[item.key];

          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.card, { borderColor: meta.color }]}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: "./screens/gesture-detail",
                  params: { level: item.key },
                })
              }>
              <View style={styles.cardTop}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: `${meta.color}20`, borderColor: meta.color },
                  ]}>
                  <MaterialIcons name={item.icon} size={24} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{meta.title}</Text>
                  <Text style={styles.cardSubtitle}>{meta.subtitle}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={26} color="#d0d3da" />
              </View>

              <View style={styles.progressRow}>
                <Text style={styles.progressText}>
                  {p.learned}/{p.total} gestos aprendidos
                </Text>
                <Text style={[styles.progressText, { color: meta.color }]}>{p.percent}%</Text>
              </View>

              <View style={styles.barBg}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${p.percent}%`, backgroundColor: meta.color },
                  ]}
                />
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={styles.note}>
          <MaterialIcons name="info-outline" size={18} color="#8a92a3" />
          <Text style={styles.noteText}>
            Esta seção é independente da câmera e não integra com ranking/perfil por enquanto.
          </Text>
        </View>

        {isAdmin && (
          <View style={styles.adminSection}>
            <View style={styles.adminHeader}>
              <Text style={styles.adminTitle}>Admin • Gerenciar Gestos</Text>
              <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
                <MaterialIcons name="add" size={16} color="#081018" />
                <Text style={styles.addBtnText}>Novo</Text>
              </TouchableOpacity>
            </View>

            {loadingCrud ? (
              <Text style={styles.adminHint}>Carregando lista de gestos...</Text>
            ) : crudItems.length === 0 ? (
              <Text style={styles.adminHint}>Nenhum gesto cadastrado no backend.</Text>
            ) : (
              crudItems.slice(0, 30).map((item) => (
                <View key={item.id} style={styles.adminRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.adminRowTitle}>{item.name}</Text>
                    <Text style={styles.adminRowSub}>
                      {item.level} • {item.category}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(item)}>
                    <MaterialIcons name="edit" size={18} color="#c7d0de" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => removeGesture(item)}>
                    <MaterialIcons name="delete" size={18} color="#ff8686" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{form.id ? "Editar gesto" : "Novo gesto"}</Text>

            <Text style={styles.inputLabel}>Nome</Text>
            <TextInput
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              style={styles.input}
              placeholder="Ex: Oi"
              placeholderTextColor="#697688"
            />

            <Text style={styles.inputLabel}>Categoria</Text>
            <TextInput
              value={form.category}
              onChangeText={(v) => setForm((f) => ({ ...f, category: v }))}
              style={styles.input}
              placeholder="Ex: Cumprimentos"
              placeholderTextColor="#697688"
            />

            <Text style={styles.inputLabel}>Descrição</Text>
            <TextInput
              value={form.description}
              onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
              style={[styles.input, { height: 76 }]}
              multiline
              placeholder="Descrição pedagógica do gesto"
              placeholderTextColor="#697688"
            />

            <Text style={styles.inputLabel}>Nível</Text>
            <TouchableOpacity
              style={styles.levelPicker}
              onPress={() => setForm((f) => ({ ...f, level: nextLevel() }))}>
              <Text style={styles.levelPickerText}>{form.level}</Text>
              <MaterialIcons name="swap-horiz" size={18} color="#c7d0de" />
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={saveGesture}
                disabled={saving}>
                <Text style={styles.saveText}>{saving ? "Salvando..." : "Salvar"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#10141a",
  },
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 12,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "700",
  },
  subtitle: {
    color: "#b8c0cc",
    marginTop: 8,
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#1a1f28",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  cardSubtitle: {
    color: "#b5bdc9",
    marginTop: 2,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressText: {
    color: "#c2c8d3",
    fontSize: 13,
  },
  barBg: {
    height: 8,
    borderRadius: 99,
    backgroundColor: "#2a2f3a",
    overflow: "hidden",
  },
  barFill: {
    height: 8,
    borderRadius: 99,
  },
  note: {
    marginTop: 8,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: "#151a22",
    padding: 10,
    borderRadius: 10,
  },
  noteText: {
    color: "#8a92a3",
    flex: 1,
    fontSize: 12,
  },
  adminSection: {
    marginTop: 14,
    backgroundColor: "#151a22",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#27303d",
  },
  adminHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  adminTitle: {
    color: "#e5ecf7",
    fontSize: 16,
    fontWeight: "700",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#00e5ff",
  },
  addBtnText: {
    color: "#081018",
    fontWeight: "700",
    fontSize: 12,
  },
  adminHint: {
    color: "#9aa7ba",
    fontSize: 13,
  },
  adminRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#222b38",
    paddingTop: 10,
    marginTop: 10,
  },
  adminRowTitle: {
    color: "#eaf0fa",
    fontWeight: "700",
  },
  adminRowSub: {
    color: "#95a3b8",
    fontSize: 12,
    marginTop: 2,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#1d2632",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(5,8,12,0.72)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#121821",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#283345",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  inputLabel: {
    color: "#9cadc3",
    fontSize: 12,
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#1a2230",
    borderWidth: 1,
    borderColor: "#2a3548",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#eff5ff",
  },
  levelPicker: {
    marginTop: 2,
    backgroundColor: "#1a2230",
    borderWidth: 1,
    borderColor: "#2a3548",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  levelPickerText: {
    color: "#eaf0fa",
    fontWeight: "600",
  },
  modalActions: {
    marginTop: 16,
    flexDirection: "row",
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  cancelBtn: {
    backgroundColor: "#1a2230",
    borderWidth: 1,
    borderColor: "#2d3a4e",
  },
  saveBtn: {
    backgroundColor: "#00e5ff",
  },
  cancelText: {
    color: "#d4ddeb",
    fontWeight: "700",
  },
  saveText: {
    color: "#081018",
    fontWeight: "700",
  },
});
