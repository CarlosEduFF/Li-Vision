import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useState, useEffect } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { trainingService } from "@/services/trainingService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { selectModelStyles as styles } from "./select-model.styles";

export default function SelectModelScreen() {
  const [models, setModels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    loadModels();
    loadActiveModel();
  }, []);

  const loadActiveModel = async () => {
    const id = await AsyncStorage.getItem("activeModelId");
    setActiveModelId(id);
  };

  const loadModels = async () => {
    try {
      const res = await trainingService.listModels();
      setModels(res.models || []);
    } catch (e) {
      console.log(e);
    } finally {
      setIsLoading(false);
    }
  };

  const activateModel = async (id: string, name: string) => {
    setActivatingId(id);
    try {
      // Esta chamada na verdade avisa ao backend para carregar/baixar o joblib do Supabase,
      // Se ele jÃ¡ existir na RAM do servidor, serÃ¡ super rÃ¡pido.
      const res = await trainingService.activateModel(name);
      if (res.ok) {
        await AsyncStorage.setItem("activeModelId", id);
        await AsyncStorage.setItem("activeModelName", name);
        setActiveModelId(id);
        
        Alert.alert(
          t('select_model.active_success_title'),
          t('select_model.active_success_msg', { name }),
          [{ text: t('select_model.amazing_btn'), onPress: () => router.back() }]
        );
      } else {
        Alert.alert(t('select_model.error'), res.error || t('select_model.error_msg'));
      }
    } catch (e) {
      Alert.alert(t('select_model.connection_error'), t('select_model.connection_error_msg', { error: String(e) }));
    } finally {
      setActivatingId(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('select_model.title')}</Text>
      </View>

      <Text style={styles.subtitle}>
        {t('select_model.subtitle')}
      </Text>

      {isLoading ? (
        <ActivityIndicator size="large" color="#b388ff" style={{ marginTop: 40 }} />
      ) : models.length === 0 ? (
        <View style={styles.emptyBox}>
          <MaterialIcons name="language" size={48} color="#333" />
          <Text style={styles.emptyText}>{t('select_model.empty_text')}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {models.map(m => {
            const isActive = activeModelId === m.id;
            const isActivating = activatingId === m.id;

            return (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.card,
                  isActive && styles.cardActive,
                ]}
                onPress={() => !isActive && activateModel(m.id, m.name)}
                disabled={activatingId !== null}
                activeOpacity={0.8}
              >
                <View style={styles.cardIndicator}>
                   <MaterialIcons 
                      name={isActive ? "check-circle" : "radio-button-unchecked"} 
                      size={28} 
                      color={isActive ? "#b388ff" : "#555"} 
                   />
                </View>

                <View style={styles.cardContent}>
                  <Text style={[styles.modelName, isActive && styles.modelNameActive]}>
                    {m.name}
                  </Text>
                  <Text style={styles.modelStatus}>
                    {isActive ? t('select_model.active_status') : t('select_model.inactive_status')}
                  </Text>
                </View>

                {isActivating && (
                  <View style={{ marginLeft: 10 }}>
                     <ActivityIndicator size="small" color="#b388ff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}




