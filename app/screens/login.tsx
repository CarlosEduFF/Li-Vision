import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { trainingService } from '../../services/trainingService';
import { useTranslation } from 'react-i18next';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert(t('login.warning'), t('login.fill_fields'));
      return;
    }
    
    setLoading(true);
    try {
      const res = await trainingService.login(email, password);
      if (res.ok && res.token) {
        await AsyncStorage.setItem("userToken", res.token);
        await AsyncStorage.setItem("userId", String(res.user_id));
        await AsyncStorage.setItem("userRole", String(res.role));
        await AsyncStorage.setItem("userName", String(res.full_name));
        if (res.avatar_url) {
          await AsyncStorage.setItem("userAvatar", res.avatar_url);
        }
        router.replace("/(tabs)");
      } else {
        Alert.alert(t('login.access_denied'), res.detail || t('login.invalid_credentials'));
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
        <Text style={styles.title}>{t('login.restricted_access')}</Text>
        <Text style={styles.subtitle}>{t('login.subtitle')}</Text>

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
            <Text style={styles.mainBtnText}>{t('login.enter')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/screens/register")} style={styles.toggleBtn}>
          <Text style={styles.toggleText}>{t('login.create_account')}</Text>
        </TouchableOpacity>
      </View>
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
  toggleText: { color: "#888", fontSize: 14, fontWeight: "600", textDecorationLine: "underline" }
});
