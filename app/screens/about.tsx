import { MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import AboutModal from "@/components/AboutModal";

export default function AboutScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [activeSlide, setActiveSlide] = useState(1);

  const openModal = (slide: number) => {
    setActiveSlide(slide);
    setModalVisible(true);
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <MaterialIcons name="tune" size={28} color="#00e5ff" />
          <Text style={styles.title}>Sobre</Text>
        </View>

        <Text style={styles.subtitle}>
          Informações sobre o Li-Vision.
        </Text>

        {/* CARD INFO ARQUITETURA */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="cloud-done" size={20} color="#4caf50" />
            <Text style={styles.sectionTitle}>Modo Multi-Sessão</Text>
          </View>
          <Text style={styles.infoText}>
            Cada usuário possui sua própria sessão isolada no servidor. 
            As configurações de detecção (Híbrido, Regras, ML Estático, ML Dinâmico) 
            são escolhidas diretamente na tela da câmera e não afetam outros usuários.
          </Text>
          <View style={styles.tipBox}>
            <MaterialIcons name="lightbulb-outline" size={18} color="#ffab00" />
            <Text style={styles.tipText}>
              Abra a câmera e toque no botão de modo no header para selecionar o cérebro de reconhecimento.
            </Text>
          </View>
        </View>

        {/* CARD AÇÕES RÁPIDAS - 4 BOTÕES COM MODAIS */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="flash-on" size={20} color="#fff" />
            <Text style={styles.sectionTitle}>Guia do Aplicativo</Text>
          </View>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openModal(1)}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <MaterialIcons name="dashboard" size={22} color="#00e5ff" />
              <View>
                <Text style={styles.actionLabel}>Apresentação do App</Text>
                <Text style={styles.actionDesc}>Conheça todas as funcionalidades e abas</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#555" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openModal(2)}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <MaterialIcons name="videocam" size={22} color="#00e5ff" />
              <View>
                <Text style={styles.actionLabel}>Como Fazer Inferência</Text>
                <Text style={styles.actionDesc}>Use a câmera para reconhecimento em tempo real</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#555" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openModal(3)}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <MaterialIcons name="science" size={22} color="#00e5ff" />
              <View>
                <Text style={styles.actionLabel}>Como Treinar Modelos</Text>
                <Text style={styles.actionDesc}>Coleta de dados e treinamento no ML Studio</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#555" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openModal(4)}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <MaterialIcons name="leaderboard" size={22} color="#00e5ff" />
              <View>
                <Text style={styles.actionLabel}>Pontuação e Ranking</Text>
                <Text style={styles.actionDesc}>Entenda como funciona o sistema de pontos</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#555" />
          </TouchableOpacity>
        </View>

        {/* CARD VERSÃO */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="info-outline" size={20} color="#fff" />
            <Text style={styles.sectionTitle}>Sobre</Text>
          </View>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Versão do App</Text>
            <Text style={styles.versionValue}>1.0.0 — Multi-Tenant</Text>
          </View>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>API Backend</Text>
            <Text style={styles.versionValue}>Li-Vision · Render</Text>
          </View>
          <View style={[styles.versionRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.versionLabel}>Arquitetura</Text>
            <Text style={styles.versionValue}>Edge + Cloud Hybrid</Text>
          </View>
        </View>
      </ScrollView>

      <AboutModal
        visible={modalVisible}
        slide={activeSlide}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#10141a",
    padding: 20,
    paddingTop: 50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  backBtn: {
    padding: 4,
    marginRight: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    marginBottom: 32,
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#1c2026",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.15)",
    shadowColor: "#00e5ff",
    shadowOpacity: 0.1,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  infoText: {
    fontSize: 14,
    color: "#a0aab5",
    lineHeight: 22,
    marginBottom: 16,
  },
  tipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(255, 171, 0, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 171, 0, 0.2)",
    borderRadius: 12,
    padding: 12,
  },
  tipText: {
    fontSize: 13,
    color: "#ccc",
    flex: 1,
    lineHeight: 18,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#262a31",
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
  },
  actionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  actionDesc: {
    fontSize: 11,
    color: "#666",
    marginTop: 2,
  },
  versionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  versionLabel: {
    fontSize: 14,
    color: "#888",
  },
  versionValue: {
    fontSize: 14,
    color: "#00e5ff",
    fontWeight: "600",
  },
});
