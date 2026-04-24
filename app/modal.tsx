import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Carousel from "react-native-reanimated-carousel";

const { width } = Dimensions.get("window");
const CAROUSEL_WIDTH = width - 60;

type CarouselSlide = {
  title: string;
  items: string[];
};

type ModalContent = {
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  image: any;
  slides: CarouselSlide[];
};

const modalsData: Record<string, ModalContent> = {
  "1": {
    title: "Apresentação do App",
    icon: "dashboard",
    image: require("../assets/images/Li-Vision-Logo-BackgroundOff.png"),
    slides: [
      {
        title: "Visão Geral",
        items: [
          "Li-Vision é um sistema de reconhecimento de gestos em tempo real",
          "Combina processamento local (Edge) e processamento em nuvem",
          "Arquitetura multi-tenant: cada usuário tem sessão isolada",
        ],
      },
      {
        title: "Aba Home (Início)",
        items: [
          "Dashboard principal do aplicativo",
          "Visão geral das atividades e estatísticas",
          "Acesso rápido às principais funcionalidades",
        ],
      },
      {
        title: "Aba Câmera",
        items: [
          "Inferência em tempo real com a câmera do dispositivo",
          "Detecção de mãos e reconhecimento de gestos",
          "Seletor de modo: Híbrido, Regras, ML Estático, ML Dinâmico",
        ],
      },
      {
        title: "Aba ML Studio",
        items: [
          "Coleta de dados estáticos e dinâmicos",
          "Gerenciamento de datasets",
          "Treinamento de modelos personalizados",
        ],
      },
      {
        title: "Aba Ranking",
        items: [
          "Leaderboard de contribuidores",
          "Visualização de pontuações",
          "Acompanhamento de evolução no sistema",
        ],
      },
      {
        title: "Aba Perfil",
        items: [
          "Informações do usuário",
          "Configurações pessoais",
          "Histórico de atividades",
        ],
      },
    ],
  },
  "2": {
    title: "Como Fazer Inferência",
    icon: "videocam",
    image: require("../assets/images/li-vision-logo-icon.png"),
    slides: [
      {
        title: "Passo 1: Acessar a Câmera",
        items: [
          "Toque no botão 'Câmera' na barra de navegação inferior",
          "Ou use o atalho na tela inicial se disponível",
          "Permita o acesso à câmera quando solicitado",
        ],
      },
      {
        title: "Passo 2: Posicionar a Mão",
        items: [
          "Posicione sua mão dentro do enquadramento",
          "Mantenha a mão a uma distância confortável (30-50cm)",
          "Evite fundos muito claros ou escuros",
          "A iluminação adequada melhora a precisão",
        ],
      },
      {
        title: "Passo 3: Selecionar o Modo",
        items: [
          "Toque no botão de modo no topo da tela",
          "Escolha entre: Híbrido, Regras, ML Estático ou ML Dinâmico",
          "Cada modo usa uma técnica diferente de reconhecimento",
          "O modo selecionado é salvo para sua sessão",
        ],
      },
      {
        title: "Modos de Detecção",
        items: [
          "Híbrido: Combina regras e machine learning",
          "Regras: Baseado em regras geométricas predefinidas",
          "ML Estático: Modelo treinado com poses estáticas",
          "ML Dinâmico: Modelo treinado com movimentos/gestos dinâmicos",
        ],
      },
      {
        title: "Dicas de Uso",
        items: [
          "Movimente a mão suavemente para melhor detecção",
          "Evite movimentos bruscos",
          "Se o gesto não for reconhecido, ajuste a posição",
          "A precisão depende da qualidade do modelo treinado",
        ],
      },
    ],
  },
  "3": {
    title: "Como Treinar Modelos",
    icon: "science",
    image: require("../assets/images/li-vision-logo-icon.png"),
    slides: [
      {
        title: "Passo 1: Coleta de Dados",
        items: [
          "Acesse o ML Studio pela aba correspondente",
          "Escolha entre coleta Estática ou Dinâmica",
          "Coleta Estática: captura poses únicas de mão",
          "Coleta Dinâmica: captura sequências de movimento",
        ],
      },
      {
        title: "Passo 2: Criar Dataset",
        items: [
          "Defina um nome para seu dataset (ex: ALFABETO_V1)",
          "Crie labels (rótulos) para cada gesto (ex: A, B, C)",
          "Colete amostras suficientes para cada label",
          "Quanto mais amostras, melhor a precisão do modelo",
        ],
      },
      {
        title: "Passo 3: Organizar Dados",
        items: [
          "Visualize estatísticas do dataset",
          "Verifique a distribuição de amostras por label",
          "Adicione mais amostras se necessário",
          "Mantenha balanceamento entre as classes",
        ],
      },
      {
        title: "Passo 4: Treinamento",
        items: [
          "Selecione o dataset para treinamento",
          "Escolha o tipo de modelo (Estático ou Dinâmico)",
          "Inicie o treinamento e aguarde a conclusão",
          "O modelo treinado ficará disponível na lista de modelos",
        ],
      },
      {
        title: "Passo 5: Usar o Modelo",
        items: [
          "Vá para a tela de seleção de modelos",
          "Escolha o modelo recém-treinado",
          "Ative-o para uso na inferência",
          "Teste na câmera para validar os resultados",
        ],
      },
    ],
  },
  "4": {
    title: "Pontuação e Ranking",
    icon: "leaderboard",
    image: require("../assets/images/li-vision-logo-icon.png"),
    slides: [
      {
        title: "Como Funciona a Pontuação",
        items: [
          "Cada atividade no app gera pontos",
          "Coleta de dados: 10 pontos por amostra",
          "Treinamento de modelo: 100 pontos por treino",
          "Uso da câmera: 1 ponto por minuto de inferência",
        ],
      },
      {
        title: "O que Conta Pontos",
        items: [
          "Coleta estática de gestos",
          "Coleta dinâmica de movimentos",
          "Criação de datasets",
          "Treinamento de modelos",
          "Contribuições para datasets públicos",
        ],
      },
      {
        title: "Sistema de Ranking",
        items: [
          "Ranking global de todos os usuários",
          "Atualização em tempo real",
          "Posição baseada no total de pontos acumulados",
          "Histórico de evolução semanal/mensal",
        ],
      },
      {
        title: "Benefícios de Contribuir",
        items: [
          "Reconhecimento na comunidade Li-Vision",
          "Acesso antecipado a novas funcionalidades",
          "Badges e conquistas especiais",
          "Contribuição para a ciência e acessibilidade",
        ],
      },
      {
        title: "Dicas para Subir no Ranking",
        items: [
          "Colete dados regularmente",
          "Crie datasets diversificados",
          "Treine modelos de qualidade",
          "Compartilhe datasets com a comunidade",
          "Use o app frequentemente para inferência",
        ],
      },
    ],
  },
};

export default function ModalScreen() {
  const { slide } = useLocalSearchParams<{ slide: string }>();
  const [activeIndex, setActiveIndex] = useState(0);
  const modalData = modalsData[slide] || modalsData["1"];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <MaterialIcons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <MaterialIcons name={modalData.icon} size={32} color="#00e5ff" />
          <Text style={styles.title}>{modalData.title}</Text>
        </View>
      </View>

      <Image source={modalData.image} style={styles.image} resizeMode="contain" />

      <View style={styles.carouselContainer}>
        <Carousel
          width={CAROUSEL_WIDTH}
          height={380}
          data={modalData.slides}
          onSnapToItem={(index) => setActiveIndex(index)}
          renderItem={({ item, index }) => (
            <View style={styles.slideCard}>
              <View style={styles.slideHeader}>
                <View style={styles.slideNumber}>
                  <Text style={styles.slideNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.slideTitle}>{item.title}</Text>
              </View>
              <View style={styles.itemsContainer}>
                {item.items.map((text, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <MaterialIcons name="check-circle" size={18} color="#4caf50" />
                    <Text style={styles.itemText}>{text}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        />
      </View>

      <View style={styles.dotsContainer}>
        {modalData.slides.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, activeIndex === index && styles.dotActive]}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <Text style={styles.closeButtonText}>Fechar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#10141a",
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#1c2026",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 229, 255, 0.15)",
  },
  closeBtn: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#ffffff",
    flex: 1,
  },
  image: {
    width: "100%",
    height: 120,
    marginVertical: 20,
  },
  carouselContainer: {
    flex: 1,
    alignItems: "center",
  },
  slideCard: {
    backgroundColor: "#1c2026",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.15)",
    height: 360,
  },
  slideHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  slideNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#00e5ff",
    alignItems: "center",
    justifyContent: "center",
  },
  slideNumberText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
  },
  slideTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    flex: 1,
  },
  itemsContainer: {
    gap: 12,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  itemText: {
    fontSize: 14,
    color: "#a0aab5",
    flex: 1,
    lineHeight: 20,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginVertical: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  dotActive: {
    width: 20,
    backgroundColor: "#00e5ff",
  },
  closeButton: {
    backgroundColor: "#00e5ff",
    marginHorizontal: 20,
    marginBottom: 30,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
  },
});
