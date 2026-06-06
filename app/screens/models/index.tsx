import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useState, useEffect } from "react";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { trainingService } from "@/services/trainingService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { modelsStyles as styles } from "@/styles/models.styles";

export default function ModelsScreen() {
  const [models, setModels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const { t } = useTranslation();
  
  // Controle de accordion/collapse para ver os submodelos
  const [expandedModels, setExpandedModels] = useState<Record<string, boolean>>({});

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

  const toggleExpand = (id: string) => {
    setExpandedModels(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const activateModel = async (id: string, name: string) => {
    setActivatingId(id);
    try {
      const res = await trainingService.activateModel(name);
      if (res.ok) {
        await AsyncStorage.setItem("activeModelId", id);
        await AsyncStorage.setItem("activeModelName", name);
        setActiveModelId(id);
        Alert.alert(
          t('models.active_success_title'),
          t('models.active_success_msg', { name })
        );
      } else {
        Alert.alert(t('models.error'), res.error || t('models.error'));
      }
    } catch (e) {
      Alert.alert(t('models.connection_error'), t('models.connection_error_msg', { error: String(e) }));
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
        <Text style={styles.title}>{t('models.title')}</Text>
      </View>

      <Text style={styles.subtitle}>
        {t('models.subtitle')}
      </Text>

      {isLoading ? (
        <ActivityIndicator size="large" color="#00e5ff" style={{ marginTop: 40 }} />
      ) : models.length === 0 ? (
        <View style={styles.emptyBox}>
          <MaterialIcons name="model-training" size={48} color="#333" />
          <Text style={styles.emptyText}>{t('models.empty_text')}</Text>
          <Text style={styles.emptyHint}>{t('models.empty_hint')}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {models.map(m => {
            const isActive = activeModelId === m.id;
            const isActivating = activatingId === m.id;
            const isExpanded = expandedModels[m.id];
            
            const hasStatic = !!m.static_model;
            const hasDynamic = !!m.dynamic_model;

            return (
              <View
                key={m.id}
                style={[
                  styles.card,
                  isActive && styles.cardActive,
                ]}
              >
                {/* CabeÃ§alho do Card */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <FontAwesome5
                      name="brain"
                      size={20}
                      color={isActive ? "#00e5ff" : "#888"}
                    />
                    <Text style={[styles.modelName, isActive && styles.modelNameActive]}>
                      {m.name}
                    </Text>
                  </View>
                  
                  <TouchableOpacity onPress={() => toggleExpand(m.id)} style={{ padding: 5 }}>
                    <MaterialIcons 
                      name={isExpanded ? "expand-less" : "expand-more"} 
                      size={24} 
                      color="#888" 
                    />
                  </TouchableOpacity>
                </View>

                {/* SubtÃ­tulos rÃ¡pidos e tags */}
                <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
                   {hasStatic && (
                     <View style={styles.typeBadge}><Text style={styles.modelType}>{t('models.static_included')}</Text></View>
                   )}
                   {hasDynamic && (
                     <View style={styles.typeBadge}><Text style={styles.modelType}>{t('models.dynamic_included')}</Text></View>
                   )}
                </View>

                {/* Ãrea ColapsÃ¡vel dos Submodelos */}
                {isExpanded && (
                  <View style={styles.submodelsArea}>
                    {hasStatic && (
                      <View style={styles.submodelRow}>
                        <MaterialIcons name="camera-alt" size={16} color="#00e5ff" />
                        <Text style={styles.submodelText}>
                          {t('models.static_info', { accuracy: (m.static_model.accuracy * 100).toFixed(1), samples: m.static_model.total_samples_trained })}
                        </Text>
                      </View>
                    )}
                    {hasDynamic && (
                      <View style={styles.submodelRow}>
                        <MaterialIcons name="videocam" size={16} color="#ffab00" />
                        <Text style={styles.submodelText}>
                          {t('models.dynamic_info', { accuracy: (m.dynamic_model.accuracy * 100).toFixed(1), samples: m.dynamic_model.total_samples_trained })}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* MÃ©tricas Globais */}
                <View style={styles.metricsRow}>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricValue}>
                      {m.total_samples}
                    </Text>
                    <Text style={styles.metricLabel}>{t('models.total_samples')}</Text>
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.metricBox}>
                    <Text style={[styles.metricValue, { color: "#fff" }]}>
                      {hasStatic && hasDynamic ? "2" : "1"}
                    </Text>
                    <Text style={styles.metricLabel}>{t('models.subnets')}</Text>
                  </View>
                </View>

                {/* Badge Ativo */}
                {isActive && (
                  <View style={styles.activeBadge}>
                    <MaterialIcons name="check-circle" size={14} color="#4caf50" />
                    <Text style={styles.activeBadgeText}>{t('models.active_group')}</Text>
                  </View>
                )}

                {/* BotÃ£o Mestre de AtivaÃ§Ã£o */}
                <TouchableOpacity
                  style={[
                    styles.activateBtn,
                    isActive && styles.activateBtnActive,
                    isActivating && { opacity: 0.7 },
                  ]}
                  onPress={() => activateModel(m.id, m.name)}
                  disabled={activatingId !== null || isActive}
                  activeOpacity={0.7}
                >
                  {isActivating ? (
                    <ActivityIndicator size="small" color={isActive ? "#00e5ff" : "#000"} />
                  ) : (
                    <MaterialIcons
                      name={isActive ? "verified" : "power-settings-new"}
                      size={20}
                      color={isActive ? "#00e5ff" : "#000"}
                    />
                  )}
                  <Text style={[
                    styles.activateBtnText,
                    isActive && styles.activateBtnTextActive,
                  ]}>
                    {isActivating
                      ? t('models.activating')
                      : isActive
                        ? t('models.active_btn')
                        : t('models.activate_btn')}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}




