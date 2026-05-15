import { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, TextInput } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { trainingService } from "../../services/trainingService";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";

export default function ManageDatasetsScreen() {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [datasetStats, setDatasetStats] = useState<any>(null);

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editType, setEditType] = useState<"dataset" | "label">("dataset");
  const [editContext, setEditContext] = useState<any>(null);
  const [editValue, setEditValue] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    loadDatasets();
    AsyncStorage.getItem("userRole").then(r => setIsAdmin(r === "admin"));
  }, []);

  const loadDatasets = async () => {
    try {
      const res = await trainingService.getDatasets();
      if (res && res.datasets) {
        setDatasets(res.datasets);
      }
    } catch (e) {
      console.log("Failed to load datasets", e);
    }
  };

  const toggleExpand = async (dataset: any) => {
    if (expandedId === dataset.id) {
      setExpandedId(null);
      setDatasetStats(null);
    } else {
      setExpandedId(dataset.id);
      setDatasetStats(null); // loading state
      try {
        const res = await trainingService.getDatasetStats(dataset.id);
        if (res && res.stats) {
          setDatasetStats(res.stats);
        } else {
          setDatasetStats({}); // empty stats
        }
      } catch (e) {
        console.log("Failed to load stats", e);
        setDatasetStats({});
      }
    }
  };

  const confirmDeleteDataset = (dataset: any) => {
    Alert.alert(
      t('manage_datasets.delete_dataset_title'),
      t('manage_datasets.delete_dataset_msg', { name: dataset.name }),
      [
        { text: t('manage_datasets.cancel'), style: "cancel" },
        { 
          text: t('manage_datasets.delete'), 
          style: "destructive", 
          onPress: async () => {
            try {
              const res = await trainingService.deleteDataset(dataset.id);
              if (res.ok) {
                if (expandedId === dataset.id) setExpandedId(null);
                loadDatasets();
              } else {
                Alert.alert(t('manage_datasets.error'), res.error || res.detail || t('manage_datasets.error'));
              }
            } catch (e) {
              Alert.alert(t('manage_datasets.network_error'), t('manage_datasets.network_error_msg', { error: String(e) }));
            }
          }
        }
      ]
    );
  };

  const confirmDeleteLabel = (datasetId: string, label: string) => {
    Alert.alert(
      t('manage_datasets.delete_label_title'),
      t('manage_datasets.delete_label_msg', { label }),
      [
        { text: t('manage_datasets.cancel'), style: "cancel" },
        { 
          text: t('manage_datasets.delete'), 
          style: "destructive", 
          onPress: async () => {
            try {
              const res = await trainingService.deleteLabel(datasetId, label);
              if (res.ok) {
                // Reload stats to update list without closing dataset
                const statsRes = await trainingService.getDatasetStats(datasetId);
                if (statsRes && statsRes.stats) setDatasetStats(statsRes.stats);
                else setDatasetStats({});
              } else {
                Alert.alert(t('manage_datasets.error'), res.error || res.detail || t('manage_datasets.error'));
              }
            } catch (e) {
              Alert.alert(t('manage_datasets.network_error'), t('manage_datasets.network_error_msg', { error: String(e) }));
            }
          }
        }
      ]
    );
  };

  const openEditDataset = (dataset: any) => {
    setEditType("dataset");
    setEditContext({ datasetId: dataset.id });
    setEditValue(dataset.name);
    setModalVisible(true);
  };

  const openEditLabel = (datasetId: string, label: string) => {
    setEditType("label");
    setEditContext({ datasetId, oldLabel: label });
    setEditValue(label);
    setModalVisible(true);
  };

  const saveEdit = async () => {
    if (!editValue.trim()) return;
    
    const normalizedValue = editValue.trim().toUpperCase();
    setModalVisible(false);
    if (editType === "dataset") {
      const res = await trainingService.renameDataset(editContext.datasetId, normalizedValue);
      if (res.ok) {
        loadDatasets();
      } else {
         Alert.alert(t('manage_datasets.rename_error'), res.error || res.detail || t('manage_datasets.rename_error'));
      }
    } else if (editType === "label") {
      const res = await trainingService.renameLabel(editContext.datasetId, editContext.oldLabel, normalizedValue);
      if (res.ok) {
        // reload current stats
        const statsRes = await trainingService.getDatasetStats(editContext.datasetId);
        if (statsRes && statsRes.stats) setDatasetStats(statsRes.stats);
      } else {
         Alert.alert(t('manage_datasets.rename_error'), res.error || res.detail || t('manage_datasets.rename_error'));
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={28} color="#00e5ff" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('manage_datasets.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {datasets.length === 0 ? (
          <Text style={styles.emptyText}>{t('manage_datasets.empty_text')}</Text>
        ) : (
          datasets.map((ds) => {
            const isExpanded = expandedId === ds.id;
            return (
              <View key={ds.id} style={styles.datasetCard}>
                <TouchableOpacity 
                  style={styles.datasetHeaderRow}
                  activeOpacity={0.7}
                  onPress={() => toggleExpand(ds)}
                >
                  <View style={styles.datasetInfo}>
                    <Text style={styles.datasetName}>{ds.name}</Text>
                    <View style={styles.chipWrapper}>
                       <Text style={styles.typeText}>{ds.type === 'static' ? t('manage_datasets.static_type') : t('manage_datasets.dynamic_type')}</Text>
                    </View>
                  </View>
                  <MaterialIcons name={isExpanded ? "expand-less" : "expand-more"} size={28} color="#00e5ff" />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.expandedContent}>
                    {isAdmin && (
                      <View style={styles.datasetActions}>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => openEditDataset(ds)}>
                          <MaterialIcons name="edit" size={18} color="#fff" />
                          <Text style={styles.actionText}>{t('manage_datasets.rename_btn')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#e53935'}]} onPress={() => confirmDeleteDataset(ds)}>
                          <MaterialIcons name="delete" size={18} color="#fff" />
                          <Text style={styles.actionText}>{t('manage_datasets.delete_dataset_btn')}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    
                    <Text style={styles.labelsTitle}>{t('manage_datasets.labels_title')}</Text>
                    
                    {!datasetStats ? (
                       <Text style={styles.loadingText}>{t('manage_datasets.loading_labels')}</Text>
                    ) : Object.keys(datasetStats).length === 0 ? (
                       <Text style={styles.emptyTextInner}>{t('manage_datasets.no_samples')}</Text>
                    ) : (
                       Object.keys(datasetStats).map(label => (
                         <View key={label} style={styles.labelRow}>
                           <View>
                             <Text style={styles.labelText}>{label}</Text>
                             <Text style={styles.labelCount}>{datasetStats[label]} amostras</Text>
                           </View>
                           <View style={styles.labelActions}>
                             {isAdmin && (
                               <>
                                 <TouchableOpacity onPress={() => openEditLabel(ds.id, label)} style={styles.iconBtn}>
                                   <MaterialIcons name="edit" size={20} color="#00e5ff" />
                                 </TouchableOpacity>
                                 <TouchableOpacity onPress={() => confirmDeleteLabel(ds.id, label)} style={styles.iconBtn}>
                                   <MaterialIcons name="delete-outline" size={20} color="#e53935" />
                                 </TouchableOpacity>
                               </>
                             )}
                           </View>
                         </View>
                       ))
                    )}
                  </View>
                )}
              </View>
            )
          })
        )}
      </ScrollView>

      {/* MODAL DE EDIÇÃO */}
      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
           <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>
                {editType === "dataset" ? "Renomear Dataset" : "Renomear Gesto"}
              </Text>
              <TextInput 
                style={styles.modalInput}
                value={editValue}
                onChangeText={setEditValue}
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus={true}
              />
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalVisible(false)}>
                   <Text style={{color: '#888', fontWeight: 'bold'}}>{t('manage_datasets.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalBtnSave} onPress={saveEdit}>
                   <Text style={{color: '#000', fontWeight: 'bold'}}>{t('manage_datasets.save')}</Text>
                </TouchableOpacity>
              </View>
           </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#10141a", padding: 20, paddingTop: 50 },
  header: { flexDirection: "row", alignItems: "center", gap: 15, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  scroll: { paddingBottom: 50 },
  emptyText: { color: "#888", textAlign: "center", marginTop: 40, fontSize: 16 },
  
  datasetCard: { backgroundColor: "#1c2026", borderRadius: 12, marginBottom: 12, overflow: "hidden", borderWidth: 1, borderColor: "rgba(0, 229, 255, 0.15)" },
  datasetHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 18, backgroundColor: "#20252d" },
  datasetInfo: { gap: 4 },
  datasetName: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  chipWrapper: { alignSelf: 'flex-start', backgroundColor: '#10141a', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: '#333' },
  typeText: { color: "#888", fontSize: 12, fontWeight: "bold" },
  
  expandedContent: { padding: 18, borderTopWidth: 1, borderTopColor: "#333" },
  datasetActions: { flexDirection: "row", gap: 10, marginBottom: 20 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#333', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  actionText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  
  labelsTitle: { fontSize: 14, color: "#888", fontWeight: "bold", marginBottom: 10 },
  loadingText: { color: "#00e5ff", fontStyle: "italic", marginTop: 5 },
  emptyTextInner: { color: "#666", fontStyle: "italic", marginTop: 5 },
  
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#2a2e35" },
  labelText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  labelCount: { color: "#00e5ff", fontSize: 14 },
  labelActions: { flexDirection: "row", gap: 15 },
  iconBtn: { padding: 4 },
  
  // MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#1c2026', width: '85%', borderRadius: 15, padding: 25, borderWidth: 1, borderColor: "rgba(0, 229, 255, 0.3)" },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  modalInput: { backgroundColor: '#10141a', color: '#00e5ff', fontSize: 20, padding: 15, borderRadius: 10, marginBottom: 20, fontWeight: 'bold' },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15 },
  modalBtnCancel: { padding: 12, paddingHorizontal: 20 },
  modalBtnSave: { backgroundColor: '#00e5ff', padding: 12, paddingHorizontal: 20, borderRadius: 10 }
});
