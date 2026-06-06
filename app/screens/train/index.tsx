import { View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useState, useEffect, useRef, useCallback } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { trainingService } from "@/services/trainingService";
import { router } from "expo-router";
import TrainingProgressModal from "@/components/TrainingProgressModal";
import { useTranslation } from "react-i18next";
import { trainStyles as styles } from "@/styles/train.styles";

export default function TrainScreen() {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [existingModels, setExistingModels] = useState<any[]>([]);
  
  const [mode, setMode] = useState<"new" | "retrain">("new");
  const [modelName, setModelName] = useState("");
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<any>(null);

  // â”€â”€ Modal de progresso â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [modalVisible, setModalVisible] = useState(false);
  const [trainingStatus, setTrainingStatus] = useState<"running" | "completed" | "failed" | "pending">("pending");
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingJobs, setTrainingJobs] = useState<any[]>([]);
  const pollingRef = useRef<boolean>(false);
  const { t } = useTranslation();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [resDatasets, resModels] = await Promise.all([
        trainingService.getDatasets(),
        trainingService.listModels()
      ]);
      setDatasets(resDatasets.datasets || []);
      setExistingModels(resModels.models || []);
    } catch (e) {
      console.log(e);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDataset = (id: string) => {
    setSelectedDatasetIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectExistingModel = (name: string) => {
    setModelName(name);
  };

  const closeModal = useCallback(() => {
    setModalVisible(false);
    pollingRef.current = false;
    // Se concluiu com sucesso, atualiza a lista de modelos
    if (trainingStatus === "completed") {
      loadData();
    }
  }, [trainingStatus]);

  const startTraining = async () => {
    if (!modelName || selectedDatasetIds.length === 0) {
      Alert.alert(t('train.warning'), t('train.warning_msg'));
      return;
    }
    try {
      // Abre modal imediatamente
      setTrainingStatus("running");
      setTrainingProgress(0);
      setTrainingJobs([]);
      setModalVisible(true);
      pollingRef.current = true;
      setStatus({ status: "running" });

      const res = await trainingService.startTraining(selectedDatasetIds, modelName);

      if (res.status === "failed") {
        setTrainingStatus("failed");
        setTrainingProgress(100);
        setTrainingJobs([{ type: "unknown", status: "failed", error: res.error || "Erro desconhecido" }]);
        setStatus(res);
        return;
      }

      // Treinamento iniciado em background â€” faz polling por nome do modelo
      const targetName = res.model_name || modelName.toUpperCase();

      // Aguarda 2s para os jobs serem criados no backend
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const pollByModel = async (): Promise<any> => {
        if (!pollingRef.current) return null;

        try {
          const pollRes = await trainingService.getTrainingStatusByModel(targetName);
          
          // Atualiza progresso no modal
          setTrainingProgress(pollRes.progress || 0);
          setTrainingJobs(pollRes.jobs || []);

          if (pollRes.status === "completed" || pollRes.status === "failed") {
            setTrainingStatus(pollRes.status as "completed" | "failed");
            setTrainingProgress(100);
            return {
              status: pollRes.status,
              details: (pollRes.jobs || []).map((j: any) => ({
                type: j.type,
                accuracy: j.accuracy,
                error: j.error,
                status: j.status,
              })),
            };
          }
        } catch (e) {
          console.log("[Poll] Erro ao verificar status:", e);
        }

        // Aguarda 2 segundos e tenta novamente (mais frequente para progresso suave)
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return pollByModel();
      };

      const finalResult = await pollByModel();
      if (finalResult) {
        setStatus(finalResult);
      }
    } catch (e) {
      setTrainingStatus("failed");
      setTrainingProgress(100);
      setTrainingJobs([]);
      setStatus({ status: "failed", error: String(e) });
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* â”€â”€ Modal de Progresso â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <TrainingProgressModal
        visible={modalVisible}
        status={trainingStatus}
        progress={trainingProgress}
        jobs={trainingJobs}
        onClose={closeModal}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={28} color="#00e5ff" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('train.title')}</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#00e5ff" style={{ marginTop: 50 }} />
      ) : (
        <View style={styles.form}>
            {/* Tabs */}
            <View style={styles.tabsRow}>
              <TouchableOpacity 
                style={[styles.tab, mode === "new" && styles.tabActive]}
                onPress={() => { setMode("new"); setModelName(""); }}
              >
                <Text style={[styles.tabText, mode === "new" && styles.tabTextActive]}>{t('train.new_model')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tab, mode === "retrain" && styles.tabActive]}
                onPress={() => setMode("retrain")}
              >
                <Text style={[styles.tabText, mode === "retrain" && styles.tabTextActive]}>{t('train.retrain')}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>{mode === "new" ? t('train.new_model_label') : t('train.base_model_label')}</Text>
            
            {mode === "new" ? (
              <TextInput 
                style={styles.input}
                placeholderTextColor="#666"
                placeholder={t('train.placeholder_name')}
                value={modelName}
                onChangeText={(v) => setModelName(v.toUpperCase())}
              />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modelsScroll}>
                {existingModels.length === 0 && <Text style={{ color: "#888" }}>{t('train.no_model')}</Text>}
                {existingModels.map(m => (
                  <TouchableOpacity 
                    key={m.name}
                    style={[styles.chip, modelName === m.name && styles.chipActive]}
                    onPress={() => selectExistingModel(m.name)}
                  >
                    <Text style={[styles.chipText, modelName === m.name && styles.chipTextActive]}>
                      {m.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <Text style={styles.label}>{t('train.select_datasets')} ({selectedDatasetIds.length})</Text>
            {datasets.length === 0 && <Text style={{ color: "#888" }}>{t('train.no_dataset')}</Text>}
            {datasets.map(ds => {
              const isSelected = selectedDatasetIds.includes(ds.id);
              return (
                <TouchableOpacity 
                  key={ds.id}
                  style={[styles.dsButton, isSelected && styles.dsButtonActive]}
                  onPress={() => toggleDataset(ds.id)}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View>
                      <Text style={isSelected ? {color:"#00e5ff", fontWeight:"bold", fontSize: 16} : {color:"#ccc", fontSize: 16}}>
                        {ds.name}
                      </Text>
                      <Text style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
                        {ds.type === "static" ? t('train.format_static') : t('train.format_dynamic')}
                      </Text>
                    </View>
                    <MaterialIcons 
                      name={isSelected ? "check-box" : "check-box-outline-blank"} 
                      size={24} 
                      color={isSelected ? "#00e5ff" : "#555"} 
                    />
                  </View>
                </TouchableOpacity>
              )
            })}

            <TouchableOpacity style={styles.captureBtn} onPress={startTraining} disabled={status?.status === "running"}>
              <MaterialIcons name="bolt" size={24} color="#000" />
              <Text style={styles.captureBtnText}>{t('train.start')}</Text>
            </TouchableOpacity>

            {status && status.status !== "running" && (
              <View style={styles.statusBox}>
                <Text style={{color: status.status === "completed" ? "#4caf50" : "red", fontWeight:"bold", marginBottom:10}}>
                  {t('train.status')} {status.status.toUpperCase()}
                </Text>
                
                {status.details && status.details.map((d: any, idx: number) => (
                   <View key={idx} style={{ marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderColor: "#333" }}>
                     <Text style={{color:"#00e5ff", fontWeight:"bold"}}>[{d.type.toUpperCase()}] Model</Text>
                     {d.accuracy != null && d.accuracy !== undefined ? (
                       <Text style={{color:"#ccc"}}>{t('train.accuracy')} {(d.accuracy * 100).toFixed(2)}%</Text>
                     ) : d.error ? (
                       <Text style={{color:"red"}}>{d.error}</Text>
                     ) : (
                       <Text style={{color:"#888"}}>{t('train.no_data')}</Text>
                     )}
                   </View>
                ))}

                {status.error && <Text style={{color:"red", marginTop: 5}}>{status.error}</Text>}
              </View>
            )}
        </View>
      )}
    </ScrollView>
  );
}




