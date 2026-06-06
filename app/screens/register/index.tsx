import React, { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { authService } from '@/features/auth/authService';
import { ApiError } from '@/lib/http';
import { useTranslation } from 'react-i18next';
import { makeRegisterStyles as makeStyles } from "@/styles/register.styles";
import { useAppTheme } from "@/context/ThemeContext";

export default function RegisterScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
      const res = await authService.register(fullName, email, password);

      if (res.ok && res.token) {
        setHasToken(true);
        setShowSuccessModal(true);
      } else {
        setHasToken(false);
        setShowSuccessModal(true);
      }
    } catch(e) {
      if (e instanceof ApiError) {
        Alert.alert(t('register.warning'), t('register.check_backend') + e.detail);
      } else {
        Alert.alert(t('login.connection_error'), t('login.connection_failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <LinearGradient colors={["rgba(0, 229, 255, 0.1)", "rgba(0,0,0,0)"]} style={StyleSheet.absoluteFill} />
      
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Image source={require('../../../assets/images/Li-Vision-Logo-BackgroundOff.png')} style={{ width: 50, height: 50 }} resizeMode="contain" />
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




