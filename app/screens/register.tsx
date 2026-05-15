import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal, Image } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { trainingService } from '../../services/trainingService';
import { useTranslation } from 'react-i18next';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async () => {
    if (!email || !password || !fullName) {
      Alert.alert(t('register.warning'), t('login.fill_fields'));
      return;
    }
    
    setLoading(true);
    try {
      const res = await trainingService.register(fullName, email, password);
      
      // Mesmo com o erro de RLS (que devolvemos na API), se a API de auth do supabase retornar user/token,
      // a conta foi criada na tabela auth.users com sucesso.
      if (res.ok && res.token || res.user) {
        if (res.token) {
          await AsyncStorage.setItem("userToken", res.token);
          await AsyncStorage.setItem("userId", String(res.user));
          await AsyncStorage.setItem("userRole", "member");
          await AsyncStorage.setItem("userName", fullName);
          setHasToken(true);
          setShowSuccessModal(true);
        } else {
           setHasToken(false);
           setShowSuccessModal(true);
        }
      } else {
        Alert.alert(t('register.warning'), t('register.check_backend') + (res.detail || "Erro desconhecido"));
      }
    } catch(e) {
      Alert.alert(t('login.connection_error'), t('login.connection_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <LinearGradient colors={["rgba(0, 229, 255, 0.1)", "rgba(0,0,0,0)"]} style={StyleSheet.absoluteFill} />
      
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Image source={require('../../assets/images/Li-Vision-Logo-BackgroundOff.png')} style={{ width: 50, height: 50 }} resizeMode="contain" />
        </View>
        <Text style={styles.title}>{t('register.new_researcher')}</Text>
        <Text style={styles.subtitle}>{t('register.subtitle')}</Text>

        <View style={styles.inputBox}>
          <MaterialIcons name="person" size={20} color="#888" style={styles.icon}/>
          <TextInput
            style={styles.input}
            placeholder={t('register.full_name')}
            placeholderTextColor="#555"
            autoCapitalize="words"
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        <View style={styles.inputBox}>
          <MaterialIcons name="email" size={20} color="#888" style={styles.icon}/>
          <TextInput
            style={styles.input}
            placeholder={t('login.email')}
            placeholderTextColor="#555"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputBox}>
          <MaterialIcons name="lock" size={20} color="#888" style={styles.icon}/>
          <TextInput
            style={styles.input}
            placeholder={t('login.password')}
            placeholderTextColor="#555"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity style={styles.mainBtn} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#0c0f16"/> : (
            <Text style={styles.mainBtnText}>{t('register.create')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/screens/login")} style={styles.toggleBtn}>
          <Text style={styles.toggleText}>{t('register.already_have')}</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL DE SUCESSO COBRINDO A TELA */}
      <Modal transparent={true} visible={showSuccessModal} animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <FontAwesome5 name="check-circle" size={60} color="#00e5ff" style={{ marginBottom: 20 }} />
            <Text style={styles.modalTitle}>{t('register.success_title')}</Text>
            <Text style={styles.modalSubtitle}>
              {hasToken 
                ? t('register.success_token')
                : t('register.success_no_token')}
            </Text>
            <TouchableOpacity 
              style={styles.modalBtn} 
              onPress={() => {
                setShowSuccessModal(false);
                if (hasToken) {
                  router.replace("/(tabs)");
                } else {
                  router.replace("/screens/login");
                }
              }}
            >
              <Text style={styles.modalBtnText}>{t('register.continue')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0e14", justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: "100%", maxWidth: 400, backgroundColor: "#1c2026", borderRadius: 24, padding: 30, borderWidth: 1, borderColor: "rgba(0, 229, 255, 0.2)", shadowColor: "#00e5ff", shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
  iconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: "rgba(0, 229, 255, 0.1)", justifyContent: "center", alignItems: "center", alignSelf: "center", marginBottom: 20, borderWidth: 1, borderColor: "#00e5ff" },
  title: { fontSize: 24, fontWeight: "800", color: "#fff", textAlign: "center", marginBottom: 10 },
  subtitle: { fontSize: 13, color: "#888", textAlign: "center", marginBottom: 30 },
  inputBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#0b0e14", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", marginBottom: 15, overflow: "hidden" },
  icon: { padding: 15 },
  input: { flex: 1, color: "#00e5ff", fontSize: 16, paddingVertical: 15, fontWeight: "600" },
  mainBtn: { backgroundColor: "#00e5ff", borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 10, shadowColor: "#00e5ff", shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  mainBtnText: { color: "#000", fontSize: 16, fontWeight: "bold" },
  toggleBtn: { marginTop: 25, alignSelf: "center", padding: 10 },
  toggleText: { color: "#888", fontSize: 14, fontWeight: "600", textDecorationLine: "underline" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalCard: { width: "100%", maxWidth: 350, backgroundColor: "#14171d", borderRadius: 24, padding: 30, alignItems: "center", borderWidth: 1, borderColor: "#00e5ff", shadowColor: "#00e5ff", shadowOpacity: 0.3, shadowRadius: 30, shadowOffset: { width: 0, height: 10 } },
  modalTitle: { fontSize: 24, fontWeight: "800", color: "#fff", marginBottom: 10, textAlign: "center" },
  modalSubtitle: { fontSize: 15, color: "#a0aab5", textAlign: "center", marginBottom: 30, lineHeight: 22 },
  modalBtn: { backgroundColor: "#00e5ff", borderRadius: 12, paddingVertical: 16, paddingHorizontal: 30, width: "100%", alignItems: "center", shadowColor: "#00e5ff", shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  modalBtnText: { color: "#000", fontSize: 16, fontWeight: "bold" }
});
