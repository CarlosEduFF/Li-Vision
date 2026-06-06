import React, { useMemo, useState, useEffect } from "react";
import { View, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform } from "react-native";
import Text from "@/components/TranslatableText";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { trainingService } from "@/services/trainingService";
import { useTranslation } from "react-i18next";
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { makeAdminConfigStyles as makeStyles } from "@/styles/admin-config.styles";
import { useAppTheme } from "@/context/ThemeContext";

export default function AdminConfigScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
      console.log("Erro ao carregar configuraÃ§Ã£o do servidor:", e);
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
        e.message || "NÃ£o foi possÃ­vel salvar no servidor. A configuraÃ§Ã£o foi revertida."
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

      // ---- LÃ“GICA PARA ESCOLHER PASTA (ANDROID) ----
      if (Platform.OS === 'android') {
        const permissions = await fs.StorageAccessFramework.requestDirectoryPermissionsAsync();
        
        if (permissions.granted) {
          // UsuÃ¡rio escolheu uma pasta
          const directoryUri = permissions.directoryUri;
          const fileUri = await fs.StorageAccessFramework.createFileAsync(
            directoryUri,
            filename,
            'application/json'
          );
          
          await fs.writeAsStringAsync(fileUri, jsonData, { encoding: 'utf8' });
          Alert.alert("Sucesso", "Backup salvo com sucesso na pasta selecionada.");
        } else {
          // Fallback para compartilhamento normal se permissÃ£o negada
          await shareFallback(jsonData, filename);
        }
      } else {
        // iOS: O menu de compartilhamento jÃ¡ tem "Salvar em Arquivos" nativamente
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
      Alert.alert("Sucesso", "Backup gerado. Compartilhamento indisponÃ­vel.");
    }
  };

  const handleImportBackup = async () => {
    Alert.alert(
      "AtenÃ§Ã£o",
      "A importaÃ§Ã£o de backup adicionarÃ¡ novos dados aos existentes. Deseja continuar?",
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
                throw new Error("O arquivo selecionado nÃ£o parece ser um backup vÃ¡lido do Li-Vision.");
              }

              const res = await trainingService.importSamples(backupData);
              if (res.ok) {
                Alert.alert("Sucesso", res.message || "Dados restaurados com sucesso!");
              } else {
                throw new Error(res.error || "Erro na importaÃ§Ã£o.");
              }
            } catch (e: any) {
              Alert.alert("Erro na ImportaÃ§Ã£o", e.message);
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




