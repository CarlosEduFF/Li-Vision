# Li-Vision

> Plataforma móvel de tradução autônoma de LIBRAS para texto em tempo real. Aplicativo concluído — fase atual: coleta de movimentos e datasets para treinamento dos modelos.

O Li-Vision converte gestos da Língua Brasileira de Sinais diretamente em texto, eliminando a dependência de intérpretes em ambientes públicos e corporativos. A detecção de landmarks ocorre **no próprio dispositivo** via MediaPipe; a classificação dos gestos é feita em nuvem via WebSocket com latência de milissegundos.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Stack Técnica](#stack-técnica)
- [Evolução do Motor de IA](#evolução-do-motor-de-ia)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Instalação e Execução](#instalação-e-execução)
- [Testes](#testes)
- [Funcionalidades](#funcionalidades)
- [Roadmap](#roadmap)

---

## Visão Geral

Mais de 10 milhões de brasileiros possuem algum grau de deficiência auditiva. A ausência de ferramentas que traduzam LIBRAS para texto em tempo real força dependência constante de intérpretes — em consultas médicas, ambientes corporativos e serviços públicos.

O Li-Vision resolve o caminho inverso ao que soluções como Hand Talk e VLibras fazem: em vez de converter texto em sinais via avatar, **lê os sinais do usuário e os converte em texto**, de forma autônoma, por câmera convencional e sem hardware especial.

---

## Arquitetura

O sistema opera em três camadas desacopladas:

```
┌─────────────────────────────────────────────┐
│              Aplicativo Mobile              │
│         React Native + Expo (TypeScript)    │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │   MediaPipe Hand Landmarker          │   │
│  │   (on-device · ~7.8 MB · sem rede)   │   │
│  │   21 landmarks (x, y, z) por mão     │   │
│  └──────────────┬───────────────────────┘   │
└─────────────────┼───────────────────────────┘
                  │ WebSocket · ~1 KB/frame
                  │ (vs. ~300 KB/frame antigo)
┌─────────────────▼───────────────────────────┐
│              Backend Python (Render)        │
│                                             │
│  ┌─────────────────┐  ┌──────────────────┐  │
│  │ MLP Scikit-     │  │  GRU Bidirecional│  │
│  │ Learn           │  │  PyTorch         │  │
│  │ Sinais estáticos│  │  Sinais dinâmicos│  │
│  └─────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────┘
```

### Por que Edge Computing?

A arquitetura anterior enviava cada frame de câmera convertido em Base64 (~300 KB) para o servidor processar. A 30 FPS, isso representava ~10 MB/s contínuos — inviável em 4G. Frames eram descartados e gestos como "Obrigado" (que dependem de 15–20 frames consecutivos) se tornavam irreconhecíveis.

A solução foi mover a etapa de visão computacional para o dispositivo: o MediaPipe extrai os 21 landmarks da mão localmente e envia apenas o array de coordenadas (~1 KB). A redução é de **~300×** no volume de dados transmitidos.

---

## Stack Técnica

### Frontend Mobile

| Pacote | Versão | Função |
|--------|--------|--------|
| `expo` | ~54.0.33 | Plataforma base e toolchain |
| `react-native` | 0.81.5 | Framework mobile |
| `expo-router` | ~6.0.23 | Roteamento baseado em arquivos |
| `react-native-vision-camera` | ^4.7.3 | Acesso ao buffer de câmera em nível nativo (C++) |
| `react-native-worklets-core` | ^1.6.3 | Execução do MediaPipe em thread secundária (60 FPS sem travar a UI) |
| `expo-speech` | ~14.0.8 | Text-to-Speech nativo (iOS + Android) |
| `@react-native-async-storage/async-storage` | 2.2.0 | Persistência do token de autenticação |
| `react-native-reanimated` | ~4.1.1 | Animações de alta performance |

### Backend Python

| Componente | Tecnologia | Uso |
|------------|-----------|-----|
| API REST + WebSocket | Python (Render) | Gestão de dados e inferência em tempo real |
| Cérebro estático | MLP — Scikit-Learn | Classificação de sinais sem movimento |
| Cérebro dinâmico | GRU Bidirecional — PyTorch | Classificação de sinais com trajetória temporal |
| Modelo on-device | MediaPipe Hand Landmarker (TFLite) | Extração de landmarks no dispositivo |

---

## Evolução do Motor de IA

O motor de reconhecimento passou por três fases. Entender essa evolução explica as decisões técnicas atuais.

### Fase 1 — Regras e Árvores de Decisão *(descartada)*

Distâncias fixas entre landmarks + `RandomForestClassifier`. Descartada porque regras baseadas em distâncias absolutas falhavam ao mudar a distância focal da câmera ou o tamanho da mão.

### Fase 2 — MLP Scikit-Learn *(ativo para sinais estáticos)*

`MLPClassifier` com camadas de 128 e 64 neurônios, recebendo coordenadas normalizadas pelo pulso.

Para sinais dinâmicos, 15 frames eram achatados em um único vetor. O problema: o modelo aprendia a posição do vetor, não o movimento de A para B. Gestos executados ao contrário geravam vetores similares, causando confusões. Sem Early Stopping, a rede memorizava os dados de treino e falhava com câmeras desconhecidas.

**Permanece ativo** para letras e sinais estáticos — consumo de memória próximo a zero no servidor é crítico para planos gratuitos com limite de 512 MB de RAM.

### Fase 3 — Arquitetura Híbrida com GRU Bidirecional *(estado atual)*

**Cérebro estático (MLP otimizado):**
- **Early Stopping**: 15% das amostras são reservadas como validação oculta. O treino para automaticamente ao detectar overfitting.
- **Regularização L2 (Alpha)**: penaliza coeficientes grandes, forçando generalização para mãos e câmeras diferentes.

**Cérebro dinâmico (GRU Bidirecional — PyTorch):**

A GRU (Gated Recurrent Unit) possui memória seletiva: lê os frames em sequência, decidindo a cada passo o que lembrar e o que descartar. A configuração bidirecional percorre a sequência em ambas as direções — do primeiro ao último frame e do último ao primeiro — combinando as representações na classificação final.

O resultado: gestos que se distinguem pela direção (varredura para a esquerda vs. direita) geram padrões inconfundíveis. O mesmo sinal executado rápido ou devagar ainda dispara o mesmo classificador, porque a GRU mapeou a trajetória, não a velocidade absoluta.

**Por que GRU e não LSTM?** A GRU tem menos parâmetros internos (2 gates vs. 3 da LSTM), reduzindo consumo de CPU/RAM no servidor. Para janelas de 15 frames, os ganhos estatísticos são equivalentes.

### Engenharia de Features

Cada frame enviado ao backend contém dois tipos de vetores:

- **Relativos** (forma da mão): coordenadas normalizadas pelo pulso → alimentam o MLP.
- **Absolutos + delta temporal** (movimento): posição bruta do pulso na tela + `Δx = x_atual − x_anterior` e `Δy = y_atual − y_anterior` → alimentam a GRU.

Os deltas codificam velocidade e direção — informação que o MLP da Fase 2 era incapaz de capturar.

---

## Estrutura do Projeto

```
li-vision/
├── app/
│   ├── _layout.tsx              # Auth guard + navegação raiz
│   ├── (tabs)/
│   │   ├── index.tsx            # Home
│   │   ├── learn.tsx            # Aprender LIBRAS
│   │   ├── studio.tsx           # ML Studio
│   │   ├── ranking.tsx          # Ranking de contribuidores
│   │   ├── profile.tsx          # Minha conta
│   │   └── about.tsx            # Sobre
│   └── screens/
│       ├── cam.tsx              # Tradução em tempo real
│       ├── collect-static.tsx   # Coleta de sinais estáticos
│       ├── collect-dynamic.tsx  # Coleta de sinais dinâmicos
│       ├── train.tsx            # Disparo de treinamento
│       ├── models.tsx           # Listagem de modelos
│       ├── select-model.tsx     # Seleção do modelo ativo
│       ├── manage-datasets.tsx  # Gerenciamento de datasets
│       ├── manage-learning.tsx  # CRUD do catálogo de gestos
│       ├── gesture-detail.tsx   # Detalhe de um gesto
│       ├── login.tsx
│       ├── register.tsx
│       └── edit-profile.tsx
│
├── services/
│   ├── api.ts                   # Cliente REST (auth + endpoints)
│   ├── gestureWebSocket.ts      # WebSocket de inferência em tempo real
│   ├── handLandmarkerPlugin.ts  # Integração MediaPipe on-device
│   ├── speechService.ts         # Text-to-Speech
│   ├── learningService.ts       # Módulo de aprendizado
│   ├── gestureService.ts        # Operações de gestos
│   └── trainingService.ts       # Disparo e polling de treinamento
│
├── hooks/
│   ├── useSpellingDetector.ts   # Buffer de soletramento com debounce
│   ├── useModelStatus.ts        # Status do modelo ativo
│   └── useCamera.ts             # Abstração da câmera
│
├── components/
│   ├── voice/
│   │   ├── VoiceSettingsModal.tsx
│   │   └── SpellingPanel.tsx
│   └── ui/
│
├── assets/
│   └── hand_landmarker.task     # Modelo MediaPipe (~7.8 MB)
│
└── plugins/
    └── withHandLandmarker.js    # Expo Config Plugin
```

---

## Instalação e Execução

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Expo CLI (`npm install -g expo-cli`)
- Para iOS: Xcode + CocoaPods
- Para Android: Android Studio + SDK

### Setup

```bash
# Instalar dependências
npm install

# Iniciar o servidor de desenvolvimento
npx expo start
```

No terminal, escolha a plataforma:
- `a` → Android emulator
- `i` → iOS simulator
- `s` → Expo Go (funcionalidade limitada — câmera nativa não disponível)

> **Atenção:** as funcionalidades de câmera e MediaPipe requerem um **development build**, não o Expo Go padrão.

### Gerar development build

```bash
# Android
npx expo run:android

# iOS
npx expo run:ios
```

---

## Testes

O projeto usa **Jest + React Testing Library** com CI via GitHub Actions.

```bash
# Rodar todos os testes
npm test

# Com cobertura
npm test -- --coverage
```

### Testes existentes

| Arquivo | Cobertura |
|---------|-----------|
| `services/__tests__/api.test.ts` | `detectGesture`, `setRunMode`, `getState` |
| `app/__tests__/_layout.test.tsx` | Auth redirect no layout raiz |

### CI/CD

O workflow `.github/workflows/ci.yml` executa automaticamente em push e PRs para `main` e `develop`:
1. Instala dependências
2. Executa os testes
3. Gera relatório de cobertura (Codecov)

### Expandir a cobertura

```
# Sugestões de próximos testes:
app/screens/cam.tsx          → pipeline de detecção
services/gestureWebSocket.ts → reconexão e timeout
hooks/useSpellingDetector.ts → lógica de debounce
```

---

## Funcionalidades

| Módulo | Status |
|--------|--------|
| Tradução em tempo real (cam + WebSocket) | ✅ Concluído |
| MediaPipe on-device | ✅ Concluído |
| Autenticação (login / registro / perfil) | ✅ Concluído |
| Coleta de sinais estáticos (crowdsourcing) | ✅ Concluído |
| Coleta de sinais dinâmicos (crowdsourcing) | ✅ Concluído |
| ML Studio (datasets, treino, modelos) | ✅ Concluído |
| Módulo de aprendizado de LIBRAS | ✅ Concluído |
| Ranking de contribuidores | ✅ Concluído |
| Síntese de voz (TTS) | ✅ Concluído |
| Detector de soletramento com debounce | ✅ Concluído |
| Treinamento do modelo MLP | ⏳ Aguardando volume de dados |
| Treinamento do modelo GRU Bidirecional | ⏳ Aguardando volume de dados |
| Validação e ajuste fino dos modelos | ⏳ Aguardando volume de dados |

---

## Roadmap

**3º Trimestre 2026 (fase atual)**
- [x] Aplicativo mobile completo
- [x] Backend e endpoints REST + WebSocket em produção
- [x] Pipeline completa de Edge Computing (MediaPipe on-device → WebSocket → classificação)
- [ ] Alimentar o sistema com movimentos e datasets via módulo de coleta
- [ ] Atingir volume de amostras suficiente para treinamento dos modelos

**4º Trimestre 2026**
- [ ] Testes heurísticos com usuários da comunidade surda
- [ ] Validação do módulo de crowdsourcing com usuários beta
- [ ] Empacotamento e publicação nas lojas (App Store / Google Play)

---

## Licença

Projeto acadêmico desenvolvido como Projeto Integrador. Todos os direitos reservados à equipe de desenvolvimento.