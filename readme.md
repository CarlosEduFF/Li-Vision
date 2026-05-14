# Li-Vision

> Plataforma móvel de tradução autônoma de LIBRAS para texto em tempo real.

O Li-Vision converte gestos da Língua Brasileira de Sinais diretamente em texto, eliminando a dependência de intérpretes em ambientes públicos e corporativos. A detecção de landmarks ocorre **no próprio dispositivo** via MediaPipe; a classificação dos gestos é feita em nuvem via WebSocket com latência de milissegundos.

**Fase atual:** aplicativo concluído — alimentando o sistema com movimentos e datasets para treinamento dos modelos.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Stack Técnica](#stack-técnica)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Instalação e Execução](#instalação-e-execução)
- [Testes](#testes)
- [Funcionalidades](#funcionalidades)
- [Roadmap](#roadmap)
- [Documentação](#documentação)

---

## Visão Geral

Mais de 10 milhões de brasileiros possuem algum grau de deficiência auditiva. A ausência de ferramentas que traduzam LIBRAS para texto em tempo real força dependência constante de intérpretes — em consultas médicas, ambientes corporativos e serviços públicos.

O Li-Vision resolve o caminho inverso ao que soluções como Hand Talk e VLibras fazem: em vez de converter texto em sinais via avatar, **lê os sinais do usuário e os converte em texto**, de forma autônoma, por câmera convencional e sem hardware especial.

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

| Arquivo | Cobertura |
|---------|-----------|
| `services/__tests__/api.test.ts` | `detectGesture`, `setRunMode`, `getState` |
| `app/__tests__/_layout.test.tsx` | Auth redirect no layout raiz |

O workflow `.github/workflows/ci.yml` executa automaticamente em push e PRs para `main` e `develop`.

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
- [ ] Treinamento e validação dos modelos com dados reais
- [ ] Testes heurísticos com usuários da comunidade surda
- [ ] Empacotamento e publicação nas lojas (App Store / Google Play)

---

## Documentação

| Documento | Conteúdo |
|-----------|----------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Diagrama do sistema, paradigma de transmissão, Edge Computing |
| [docs/AI_ENGINE.md](docs/AI_ENGINE.md) | Evolução do motor de IA, GRU Bidirecional, engenharia de features |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Como coletar amostras e alimentar o dataset — **leia antes de contribuir** |

---

## Licença

Projeto acadêmico desenvolvido como Projeto Integrador. Todos os direitos reservados à equipe de desenvolvimento.
