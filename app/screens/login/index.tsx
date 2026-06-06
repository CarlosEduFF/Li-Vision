import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { loginStyles as styles } from "@/styles/login.styles";

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { handleLogin, loading } = useAuth();
  const { t } = useTranslation();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <LinearGradient colors={["rgba(0, 229, 255, 0.1)", "rgba(0,0,0,0)"]} style={StyleSheet.absoluteFill} />
      
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Image source={require('../../../assets/images/Li-Vision-Logo-BackgroundOff.png')} style={{ width: 50, height: 50 }} resizeMode="contain" />
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

        <TouchableOpacity style={styles.mainBtn} onPress={() => handleLogin(email, password)} disabled={loading}>
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




