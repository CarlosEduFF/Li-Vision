import React, { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform } from "react-native";
import Text from "@/components/TranslatableText";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { trainingService } from "@/services/trainingService";
import { useTranslation } from "react-i18next";
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

export default function AdminConfigScreen() {
  const [isRulesEnabled, setIsRulesEnabled] = useState(true);
  const [loadingBackup, setLoadingBackup] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const serverEnabled = await trainingService.getRulesEnabled();
      if (serverEnabled !== undefined) {
        setIsRulesEnabled(serverEnabled);
        await AsyncStorage.setItem("config_rules_enabled", String(serverEnabled));
        return;
      }
    } catch (e) {
      console.log("Erro ao carregar configuração do servidor:", e);
    }
    const rulesStored = await AsyncStorage.getItem("config_rules_enabled");
    setIsRulesEnabled(rulesStored !== "false");
  };

  const toggleRulesMode = async () => {
    const nextValue = !isRulesEnabled;
    
    // Otimista: assume sucesso no app primeiro
    setIsRulesEnabled(nextValue);
    await AsyncStorage.setItem("config_rules_enabled", String(nextValue));
    
    try {
      const res = await trainingService.setRulesEnabled(nextValue);
      if (!res.ok) {
        throw new Error(res.detail || res.error || "Erro desconhecido ao salvar no servidor");
      }
    } catch (e: any) {
      Alert.alert(
        "Erro ao sincronizar",
        e.message || "Não foi possível salvar no servidor. A configuração foi revertida."
      );
      // Reverte se falhar
      setIsRulesEnabled(!nextValue);
      await AsyncStorage.setItem("config_rules_enabled", String(!nextValue));
    }
  };

  const handleExportBackup = async () => {
    setLoadingBackup(true);
    try {
      const res = await trainingService.exportSamples();
      if (!res.ok) throw new Error(res.error || "Erro ao buscar dados");

      const jsonData = JSON.stringify(res, null, 2);
      const filename = `LiVision_Backup_${new Date().toISOString().split('T')[0]}.json`;
      
      const fs = FileSystem as any;

      // ---- LÓGICA PARA ESCOLHER PASTA (ANDROID) ----
      if (Platform.OS === 'android') {
        const permissions = await fs.StorageAccessFramework.requestDirectoryPermissionsAsync();
        
        if (permissions.granted) {
          // Usuário escolheu uma pasta
          const directoryUri = permissions.directoryUri;
          const fileUri = await fs.StorageAccessFramework.createFileAsync(
            directoryUri,
            filename,
            'application/json'
          );
          
          await fs.writeAsStringAsync(fileUri, jsonData, { encoding: 'utf8' });
          Alert.alert("Sucesso", "Backup salvo com sucesso na pasta selecionada.");
        } else {
          // Fallback para compartilhamento normal se permissão negada
          await shareFallback(jsonData, filename);
        }
      } else {
        // iOS: O menu de compartilhamento já tem "Salvar em Arquivos" nativamente
        await shareFallback(jsonData, filename);
      }

    } catch (e: any) {
      Alert.alert("Erro no Backup", e.message);
    } finally {
      setLoadingBackup(false);
    }
  };

  const shareFallback = async (data: string, filename: string) => {
    const fs = FileSystem as any;
    const cacheDir = fs.cacheDirectory || fs.documentDirectory || "";
    const tempUri = cacheDir + filename;
    
    await fs.writeAsStringAsync(tempUri, data, { encoding: 'utf8' });
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(tempUri);
    } else {
      Alert.alert("Sucesso", "Backup gerado. Compartilhamento indisponível.");
    }
  };

  const handleImportBackup = async () => {
    Alert.alert(
      "Atenção",
      "A importação de backup adicionará novos dados aos existentes. Deseja continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Continuar", 
          onPress: async () => {
            try {
              const result = await DocumentPicker.getDocumentAsync({
                type: "application/json",
                copyToCacheDirectory: true,
              });

              if (result.canceled) return;

              setLoadingImport(true);
              const fs = FileSystem as any;
              const fileContent = await fs.readAsStringAsync(result.assets[0].uri, { encoding: 'utf8' });
              const backupData = JSON.parse(fileContent);

              if (!backupData.samples || !backupData.datasets) {
                throw new Error("O arquivo selecionado não parece ser um backup válido do Li-Vision.");
              }

              const res = await trainingService.importSamples(backupData);
              if (res.ok) {
                Alert.alert("Sucesso", res.message || "Dados restaurados com sucesso!");
              } else {
                throw new Error(res.error || "Erro na importação.");
              }
            } catch (e: any) {
              Alert.alert("Erro na Importação", e.message);
            } finally {
              setLoadingImport(false);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('profile.admin.title')}</Text>
        <Text style={styles.subtitle}>{t('profile.admin.subtitle')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.admin.sec_general')}</Text>
        
        <TouchableOpacity 
          style={styles.card} 
          onPress={toggleRulesMode}
          activeOpacity={0.7}
        >
          <View style={styles.cardLeft}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 107, 107, 0.1)' }]}>
              <MaterialIcons name="rule" size={24} color="#ff6b6b" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{t('profile.admin.rules_toggle')}</Text>
              <Text style={styles.cardDesc}>{t('profile.admin.rules_desc')}</Text>
            </View>
          </View>
          <View style={[styles.toggleOuter, isRulesEnabled && styles.toggleOuterActive]}>
            <View style={[styles.toggleInner, isRulesEnabled && styles.toggleInnerActive]} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.admin.sec_data')}</Text>
        
        {/* EXPORTAR */}
        <TouchableOpacity 
          style={styles.card} 
          onPress={handleExportBackup}
          disabled={loadingBackup || loadingImport}
          activeOpacity={0.7}
        >
          <View style={styles.cardLeft}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(0, 229, 255, 0.1)' }]}>
              <MaterialIcons name="cloud-download" size={24} color="#00e5ff" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{t('profile.admin.export_title')}</Text>
              <Text style={styles.cardDesc}>{t('profile.admin.export_desc')}</Text>
            </View>
          </View>
          {loadingBackup ? (
            <ActivityIndicator color="#00e5ff" />
          ) : (
            <MaterialIcons name="chevron-right" size={24} color="#555" />
          )}
        </TouchableOpacity>

        {/* IMPORTAR */}
        <TouchableOpacity 
          style={styles.card} 
          onPress={handleImportBackup}
          disabled={loadingBackup || loadingImport}
          activeOpacity={0.7}
        >
          <View style={styles.cardLeft}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
              <MaterialIcons name="cloud-upload" size={24} color="#4caf50" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{t('profile.admin.import_title')}</Text>
              <Text style={styles.cardDesc}>{t('profile.admin.import_desc')}</Text>
            </View>
          </View>
          {loadingImport ? (
            <ActivityIndicator color="#4caf50" />
          ) : (
            <MaterialIcons name="chevron-right" size={24} color="#555" />
          )}
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#4caf50" />
          <Text style={styles.infoText}>
            {t('profile.admin.info_box')}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('profile.admin.footer')}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#10141a",
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#8a92a3",
    lineHeight: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#4a5568",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 15,
    marginLeft: 5,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1c2026",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2a3548",
    marginBottom: 12,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: "#697688",
  },
  toggleOuter: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#2a3548",
    padding: 2,
    justifyContent: "center",
  },
  toggleOuterActive: {
    backgroundColor: "#ff6b6b",
  },
  toggleInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  toggleInnerActive: {
    transform: [{ translateX: 20 }],
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "rgba(76, 175, 80, 0.05)",
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.1)",
    marginTop: 10,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#81c784",
    lineHeight: 18,
  },
  footer: {
    marginTop: 20,
    alignItems: "center",
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 12,
    color: "#2d3748",
  },
});
