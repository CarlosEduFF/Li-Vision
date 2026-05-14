# Arquitetura do Sistema — Li-Vision

Este documento descreve a arquitetura técnica do Li-Vision: como as camadas se comunicam, por que a abordagem de Edge Computing foi adotada e qual é o fluxo completo de um gesto capturado até o texto exibido na tela.

---

## Visão Geral

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
│  │  MLP Scikit-    │  │  GRU Bidirecional│  │
│  │  Learn          │  │  PyTorch         │  │
│  │  Sinais estáticos│ │  Sinais dinâmicos│  │
│  └─────────────────┘  └──────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │  API REST                            │   │
│  │  Gestão de datasets, modelos e users │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## Paradigma de Transmissão: do Streaming para Edge Computing

### O problema: streaming de imagens brutas

Na versão inicial da arquitetura, o aplicativo operava como um transmissor passivo. A câmera capturava cada frame, o aplicativo o convertia para o formato Base64 — uma representação textual de todos os pixels em binário — e enviava a string resultante ao servidor via WebSocket. O servidor, por sua vez, executava o MediaPipe para extrair os landmarks e só então alimentava o modelo de classificação.

Este fluxo gerava três problemas encadeados:

**1. Custo de rede**
Uma imagem de câmera convertida em Base64 possui entre 100 e 400 KB por frame. A 30 frames por segundo, o aplicativo tentava transmitir entre 3 e 12 MB/s continuamente — volume incompatível com conexões 4G em ambientes públicos.

**2. Perda de frames**
Sob congestionamento, o WebSocket descartava quadros para acompanhar o tempo real. Para LIBRAS, onde um sinal como "Obrigado" depende da trajetória suave entre 15 e 20 frames consecutivos, a perda de qualquer quadro intermediário tornava o gesto irreconhecível pelo modelo.

**3. Latência de processamento**
O servidor precisava decodificar a imagem e rodar o MediaPipe antes de iniciar a inferência, adicionando dezenas de milissegundos ao tempo de resposta.

---

### A solução: Edge Computing com MediaPipe on-device

A solução transfere a etapa de visão computacional do servidor para o próprio dispositivo — o paradigma de **Edge Computing**, em que o processamento ocorre na borda da rede, no dispositivo mais próximo da fonte de dados.

O modelo MediaPipe Hand Landmarker (`hand_landmarker.task`, ~7,8 MB) é distribuído diretamente no pacote do aplicativo e executado localmente via `react-native-worklets-core` em uma thread secundária de alto desempenho, sem bloquear a interface do usuário.

O resultado do processamento é um array de **21 pontos tridimensionais** representando as articulações da mão — menos de **1 KB por frame**.

| | Antes | Depois |
|--|-------|--------|
| Dado transmitido | Frame Base64 (~300 KB) | Array de landmarks (~1 KB) |
| Redução de volume | — | ~300× |
| Processamento de imagem no servidor | Sim | Não |
| Sensibilidade a perda de frames | Alta | Negligenciável |

---

## Fluxo Completo de um Gesto

```
Câmera (hardware)
    │
    ▼ buffer de frames (C++ nativo)
react-native-vision-camera
    │
    ▼ thread secundária (worklet)
MediaPipe Hand Landmarker (on-device)
    │  extrai 21 landmarks (x, y, z) por mão
    ▼
gestureWebSocket.ts
    │  serializa array + deltas temporais
    │  envia via WebSocket (~1 KB)
    ▼
Backend Python (Render)
    │
    ├─► MLP Scikit-Learn ──► sinal estático detectado
    │
    └─► GRU Bidirecional ──► sinal dinâmico detectado
              │
              ▼ JSON: {"gesture": "Obrigado", "confidence": 0.94}
WebSocket (resposta)
    │
    ▼
cam.tsx — exibe texto na tela
    │
    ▼
speechService.ts — verbaliza o gesto (TTS)
```

---

## Camadas e Responsabilidades

### Camada de Apresentação — Frontend Mobile

Aplicativo React Native com Expo (v54) e TypeScript. Organizado em seis abas de navegação (Home, Aprender, ML Studio, Ranking, Minha Conta, Sobre) e telas de funcionalidade dedicadas.

Responsabilidades:
- Captura de vídeo e extração de landmarks (on-device)
- Envio de dados via WebSocket
- Exibição do texto traduzido
- Síntese de voz dos gestos detectados
- Interface de coleta de amostras (crowdsourcing)
- ML Studio para administração de modelos e datasets

### Camada de Serviços — TypeScript (`services/`)

Módulos que abstraem toda comunicação externa:

| Serviço | Função |
|---------|--------|
| `api.ts` | Cliente REST autenticado via Bearer Token |
| `gestureWebSocket.ts` | Canal WebSocket persistente para inferência em tempo real |
| `handLandmarkerPlugin.ts` | Integração do MediaPipe on-device |
| `speechService.ts` | Text-to-Speech via expo-speech |
| `trainingService.ts` | Disparo e polling de ciclos de treinamento |
| `gestureService.ts` | CRUD de gestos do catálogo |
| `learningService.ts` | Dados do módulo de aprendizado |

### Camada de Inteligência Artificial — Backend Python

API hospedada no Render, expondo:
- **Endpoints REST** para gestão de datasets, modelos e usuários
- **Endpoint WebSocket** para inferência em tempo real frame a frame

Os dois modelos operam em conjunto. A cada sequência recebida, o backend decide qual acionar com base na presença de delta temporal significativo entre os frames.

> Para detalhes sobre os modelos, treinamento e engenharia de features, consulte [AI_ENGINE.md](AI_ENGINE.md).

---

## Autenticação

Todas as requisições autenticadas utilizam Bearer Token armazenado via `@react-native-async-storage/async-storage`. O helper `authHeaders()` em `api.ts` injeta o token automaticamente nos cabeçalhos HTTP de cada requisição.
