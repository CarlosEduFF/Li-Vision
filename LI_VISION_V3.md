# Li-Vision V3 — Reconhecimento Holístico de Libras (mãos + rosto + corpo)

> **TL;DR** — A V2 lia **só as mãos**. A V3 passa a ler a pessoa inteira:
> **mãos + rosto + corpo** ("holístico"), porque um sinal de Libras carrega
> significado também na expressão facial (marcadores não-manuais) e na postura.
> A mudança atravessa as três camadas — **Plugin**, **App** e **API backend** —
> mas foi desenhada para ser **100% retrocompatível**: o caminho "só mãos"
> continua intacto, e a V3 é ativada por um *opt-in*.

---

## Sumário

- [1. Por que "holístico"?](#1-por-que-holístico)
- [2. Visão geral da arquitetura](#2-visão-geral-da-arquitetura)
- [3. O conceito-chave: schemas de features](#3-o-conceito-chave-schemas-de-features)
- [4. Camada 1 — Plugin (Edge / on-device)](#4-camada-1--plugin-edge--on-device)
- [5. Camada 2 — App (React Native / Expo)](#5-camada-2--app-react-native--expo)
- [6. Camada 3 — API backend (Python / FastAPI)](#6-camada-3--api-backend-python--fastapi)
- [7. Como as três camadas se relacionam (fluxo ponta a ponta)](#7-como-as-três-camadas-se-relacionam-fluxo-ponta-a-ponta)
- [8. Comparativo V2 × V3](#8-comparativo-v2--v3)
- [9. Retrocompatibilidade — por que nada quebra](#9-retrocompatibilidade--por-que-nada-quebra)
- [10. Como rodar / migrar para a V3](#10-como-rodar--migrar-para-a-v3)
- [11. Pontos de atenção e próximos passos](#11-pontos-de-atenção-e-próximos-passos)

---

## 1. Por que "holístico"?

"**Holistic**" é o termo oficial do **Google MediaPipe** para a solução que
processa a **pessoa inteira** num único pipeline, combinando três detectores:

| Canal | Modelo MediaPipe | Pontos | O que carrega em Libras |
|---|---|---|---|
| **Mãos** | Hand Landmarker | 21 por mão | Configuração e movimento das mãos |
| **Rosto** | Face Landmarker | até 478 | Marcadores **não-manuais**: sobrancelhas, olhos, boca — distinguem afirmação de pergunta, intensidade, etc. |
| **Corpo** | Pose Landmarker | 33 | Postura, referência espacial, ênfase |

"Holístico" vem do grego *hólos* (inteiro). A ideia: **o significado do sinal é
do todo, não só das mãos**. Ler apenas as mãos perde parte da mensagem — é a
limitação central que a V3 resolve.

> O nome não foi escolhido pelo app: ele já era a convenção no backend
> (`HolisticFrame`, schema `holistic_v1`) e no plugin (`HolisticDetectionResult`).
> A V3 do app apenas passou a **falar a mesma língua** das outras camadas.

---

## 2. Visão geral da arquitetura

A filosofia do Li-Vision é **Edge Computing**: a extração de landmarks acontece
**no dispositivo** (rápido, privado, sem enviar vídeo), e só os **pontos**
(poucos KB) trafegam para a nuvem, que faz a **classificação** do gesto.

```
┌─────────────────────── DISPOSITIVO (Edge) ───────────────────────┐
│                                                                    │
│   Câmera ──► PLUGIN (MediaPipe nativo, Kotlin)                     │
│              detecta mãos (+ rosto + corpo na V3)                  │
│                      │                                             │
│                      ▼                                             │
│              APP (React Native)                                    │
│              transforma + monta payload JSON                      │
│                      │                                             │
└──────────────────────┼─────────────────────────────────────────────┘
                       │  WebSocket (landmarks ~1–5 KB)
                       ▼
┌─────────────────────── NUVEM (Render) ───────────────────────────┐
│              API BACKEND (FastAPI + ML)                           │
│              monta vetor de features ──► modelo ──► gesto         │
│                      │                                             │
└──────────────────────┼─────────────────────────────────────────────┘
                       │  {"gesture": "OI", "confidence": 0.93}
                       ▼
                  APP exibe / fala (TTS)
```

A V3 **não muda essa topologia** — muda **o que** flui pelo cano: além das mãos,
agora também rosto e corpo, quando o modo holístico está ligado.

---

## 3. O conceito-chave: schemas de features

Tudo na V3 gira em torno de um conceito único e versionado: o **schema de
features**. Ele é o "contrato" que diz qual a forma do dado.

| Schema | Conteúdo | Tamanho por frame | Quem usa |
|---|---|---|---|
| `hands_v1` | 2 mãos × 65 | **130** features | Toda a V2; V3 com holístico OFF |
| `holistic_v1` | 130 (mãos) + pose + face | **130 + pose + face** | V3 com holístico ON |

O brilho do design: **o schema é detectado pela *forma* do payload**, não por um
campo extra:

- Payload é um **array** `[[{x,y,z}×21], ...]` → schema `hands_v1`.
- Payload é um **objeto** `{hands, pose, face}` → schema `holistic_v1`.

Isso é o que torna a migração indolor: o app só muda **a forma do que envia**, e
o backend deduz o resto. Detalhes da composição do vetor:

- **Mãos (65/mão):** 2 absolutas do pulso + 21×3 relativas (x-base, y-base, z).
  Bit-a-bit idêntico à V2.
- **Pose (corpo):** subconjunto de 13 pontos relevantes (cabeça, ombros,
  cotovelos, pulsos, quadris) — evita ruído de pernas — normalizado pelo ponto
  médio dos ombros. Cada ponto: `(x, y, z, visibility)`.
- **Rosto:** subconjunto de ~30 pontos (sobrancelhas, olhos, boca, bochechas),
  normalizado pelo centroide. Cada ponto: `(x, y, z)`.

> **Importante:** o *subconjunto* de pose/face (quais índices usar) é escolhido
> **no servidor** (`POSE_INDICES` / `FACE_INDICES` em
> `holistic_features.py`). O app envia os canais **completos** (33 e 478 pontos);
> filtrar no cliente quebraria os índices do servidor.

---

## 4. Camada 1 — Plugin (Edge / on-device)

**Pacote:** `expo-vision-camera-v4-mediapipe` · **V2:** 1.1.1 → **V3:** 1.2.0

O plugin é um **Frame Processor nativo (Kotlin)** que roda o MediaPipe direto no
buffer da câmera, sem overhead de bridge. Retorna coordenadas normalizadas.

### O que mudou na 1.2.0

| Aspecto | V2 (1.1.1) | V3 (1.2.0) |
|---|---|---|
| Canais | Só mãos (21 pts × até 2 mãos) | Mãos + **Pose (33)** + **Face (478)** |
| Ativação | — | `enablePose` / `enableFace` no `app.json` (default `false`) |
| Resultado | `HandDetectionResult` | + campos opcionais `pose`, `face` |
| Tipos | `HandLandmark`, `HandednessCategory` | + `PoseLandmark`, `FaceLandmark`, `PoseLandmarkIndex`, `HolisticDetectionResult` |
| Modelos | `hand_landmarker.task` | + `pose_landmarker_lite.task`, `face_landmarker.task` |
| Geração nativa | Landmarker de mãos | Cria Pose/Face landmarkers **só se os flags estiverem ON** (sem custo para quem usa só mãos) |

### Configuração na V3 (`app.json`)

```jsonc
["expo-vision-camera-v4-mediapipe/plugin", {
  "numHands": 2,
  "minDetectionConfidence": 0.4,
  "minPresenceConfidence": 0.4,
  "minTrackingConfidence": 0.4,
  "enablePose": true,   // ← novo na V3
  "enableFace": true    // ← novo na V3
}]
```

Os modelos `pose_landmarker_lite.task` e `face_landmarker.task` precisam estar
em `assets/` (não são empacotados no npm para manter o pacote leve). O plugin os
copia para os assets nativos no `prebuild`.

---

## 5. Camada 2 — App (React Native / Expo)

O app foi onde estava o **gargalo da V2**: backend e plugin já suportavam
holístico, mas o app **descartava** pose/face e enviava só o array de mãos. A V3
do app conserta isso em quatro pontos.

### 5.1 `app.json` — ligar os canais nativos
Adiciona `enablePose` / `enableFace` (acima). Sem isso, o nativo nem cria os
landmarkers de corpo/rosto.

### 5.2 `services/handLandmarkerPlugin.ts` — parar de truncar o tipo
A V2 tipava o retorno como `HandDetectionResult`, **jogando fora** `pose`/`face`.
A V3 tipa como `HolisticDetectionResult` e re-exporta `PoseLandmark`,
`FaceLandmark`, `PoseLandmarkIndex`.

### 5.3 `services/holisticFeatures.ts` — **novo** (coração da V3 no app)
Centraliza duas responsabilidades que na V2 estavam duplicadas *inline* em cada
tela:

- **`transformPoint`** — a rotação/espelhamento da câmera frontal
  (`x = 1 − y`, `y = 1 − x`), agora aplicada **identicamente** a mãos, pose e
  face (senão os canais ficariam em referenciais diferentes).
- **`buildPayload(result, schema)`** — decide a forma do envio:
  - `hands_v1` → array cru de mãos (compat total)
  - `holistic_v1` → objeto `{ hands, pose?, face? }` (pose/face só entram se
    detectados no frame).

### 5.4 `services/gestureWebSocket.ts` — novo método de envio
Mantém o `sendLandmarks(hands)` da V2 e adiciona:

```ts
sendHolistic(payload)  // aceita array (hands_v1) OU objeto (holistic_v1)
```

Como o backend detecta o schema pela forma, **um método cobre os dois casos**.

### 5.5 Telas
- **`cam` (inferência):** ganhou um **toggle holístico** no header
  (ícone "pessoa"), persistido em `AsyncStorage` (`config_holistic_enabled`).
  Ligado → envia `holistic_v1`; desligado → `hands_v1`.
- **`collect-dynamic` (coleta de sinais com movimento):** mesmo toggle
  ("Holístico / Só mãos"), bloqueado durante uma gravação para não trocar de
  schema no meio.
- **`collect-static` (alfabeto):** **mantida como só-mãos de propósito** — o
  backend de estático ainda extrai só mãos, e letras paradas não ganham com
  rosto/corpo.

### 5.6 Centralização da URL da API (refator de manutenção)
Como parte da V3, a URL da API passou a ter **fonte única** em `config/api.ts`:

```ts
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://li-visionv3.onrender.com";
export const WS_BASE_URL  = API_BASE_URL.replace(/^http/, "ws"); // deriva wss://
export function apiUrl(path) // monta REST
export function wsUrl(path)  // monta WebSocket
```

Na V2 a URL estava hardcoded em 4+ arquivos. Na V3, trocar de host é **uma
linha** (ou a env `EXPO_PUBLIC_API_URL`), e o `wss://` é derivado sozinho.

---

## 6. Camada 3 — API backend (Python / FastAPI)

> **Nota importante:** o backend **já estava pronto para holístico antes da V3
> do app**. Esta seção descreve o que existe; a V3 do app foi o que finalmente
> passou a *exercitar* esse suporte. Nenhuma mudança de backend foi necessária
> para ligar o holístico.

### 6.1 Recepção — `src/api/holistic.py`
A função `parse_input(parsed)` normaliza o payload num `HolisticFrame`:

- Recebe **lista** → `hands` (legado `hands_v1`).
- Recebe **objeto** `{hands, pose, face}` → holístico (`holistic_v1`).
- `HolisticFrame` com `pose=None, face=None` se comporta **exatamente** como o
  array de mãos da V2.

### 6.2 Montagem do vetor — `src/data_collection/holistic_features.py`
Fonte única e versionada do vetor por frame (`build_frame_vector(frame, schema)`).
**Coleta e inferência usam a mesma função**, garantindo que o vetor de treino e o
de inferência sejam idênticos. Define `POSE_INDICES`, `FACE_INDICES` e os
tamanhos por schema.

### 6.3 Coleta — `src/services/collection_service.py`
Na coleta **dinâmica**, o schema é **auto-detectado no primeiro frame**: se chega
pose/face, o dataset é criado como `holistic_v1`; senão, `hands_v1`. Ou seja, o
app só precisa enviar holístico — o backend rotula o dataset sozinho.

### 6.4 Inferência — `src/detectors/ml_detectors/sequence_detector.py`
O `SequenceGestureDetector`:
- Lê `n_features_in_` do modelo treinado e **infere o schema pelo tamanho** do
  frame (`_infer_schema`): se bate com o tamanho de `holistic_v1`, usa holístico.
- Delega a montagem do vetor ao módulo unificado — paridade com a coleta.
- Mantém caminhos legados (42/63/126 features) para modelos antigos.

### 6.5 Modos e WebSocket
- `/ws/detect` — inferência em tempo real, multi-tenant (cada conexão tem sua
  `UserSession` isolada). Aceita o payload legado **e** o holístico.
- Modos de detecção: `rules`, `ml`, `dynamic_ml`, `hybrid` — inalterados na V3.

---

## 7. Como as três camadas se relacionam (fluxo ponta a ponta)

### Inferência holística (V3, toggle ON)

```
1. PLUGIN  (Kotlin, on-device)
   Câmera → MediaPipe → { hands:[...], pose:[33], face:[478] }

2. APP     (handLandmarkerPlugin.ts → cam/index.tsx)
   detectHandLandmarks(frame) devolve o resultado holístico completo
   → onLandmarksDetected(result)
   → buildPayload(result, "holistic_v1")    // transforma + monta objeto
   → gestureWS.sendHolistic({ hands, pose, face })

3. WEBSOCKET
   JSON do objeto trafega (~poucos KB) para wss://.../ws/detect

4. API     (websocket_routes → parse_input → holistic.py)
   objeto → HolisticFrame(hands, pose, face)   // schema holistic_v1 detectado

5. API     (sequence_detector → holistic_features.build_frame_vector)
   monta vetor 130 + pose + face → janela de N frames → modelo.predict

6. API → APP
   { "gesture": "OI", "confidence": 0.93, "mode": "hybrid" }

7. APP
   exibe overlay + fala (TTS) se habilitado
```

### O mesmo fluxo com toggle OFF (idêntico à V2)

```
PLUGIN → { hands } (pose/face ignorados pelo app)
APP    → buildPayload(result, "hands_v1") → array cru
APP    → gestureWS.sendHolistic([[...]])   // array
API    → lista → HolisticFrame(hands)      // schema hands_v1
API    → vetor 130 → modelo → gesto
```

A **única diferença** entre os dois é a **forma do payload** (objeto vs array) —
decidida por um booleano no app.

---

## 8. Comparativo V2 × V3

| Dimensão | **V2 (só mãos)** | **V3 (holístico)** |
|---|---|---|
| **Canais lidos** | Mãos (21 pts) | Mãos + Rosto (478) + Corpo (33) |
| **Significado capturado** | Configuração/movimento das mãos | + Expressão facial (não-manuais) + postura |
| **Plugin** | 1.1.1 | 1.2.0 (`enablePose`/`enableFace`) |
| **Modelos `.task`** | 1 (mãos) | 3 (mãos, pose, face) |
| **Schema de features** | `hands_v1` (130/frame) | `hands_v1` **ou** `holistic_v1` |
| **Payload WebSocket** | Array `[[{x,y,z}×21]]` | Array **ou** objeto `{hands,pose,face}` |
| **App — tipo do plugin** | `HandDetectionResult` (trunca pose/face) | `HolisticDetectionResult` |
| **App — montagem do payload** | Inline, duplicada por tela | Centralizada em `holisticFeatures.ts` |
| **App — envio** | `sendLandmarks()` | + `sendHolistic()` |
| **App — UI** | — | Toggle holístico (cam + collect-dynamic) |
| **App — URL da API** | Hardcoded em 4+ arquivos | Fonte única em `config/api.ts` |
| **Coleta estática** | Só mãos | Só mãos (inalterado) |
| **Coleta dinâmica** | Só mãos | Holística (schema auto-detectado) |
| **Backend** | Já suportava holístico (não exercitado) | Mesmo código, agora exercitado pelo app |
| **Custo de CPU** | Baixo | Maior (478 pts de rosto/frame) — ver §11 |

---

## 9. Retrocompatibilidade — por que nada quebra

A V3 foi desenhada para **coexistir** com a V2, não substituí-la:

1. **Plugin:** com `enablePose`/`enableFace` em `false` (default), a 1.2.0 gera
   código e resultado **idênticos** à 1.1.1.
2. **App:** com o toggle OFF, `buildPayload` produz o **mesmo array** da V2;
   `sendHolistic([[...]])` é equivalente ao antigo `sendLandmarks`.
3. **Backend:** `parse_input` aceita os dois formatos; `HolisticFrame` sem
   pose/face = array de mãos da V2.
4. **Modelos:** datasets e modelos `hands_v1` antigos continuam válidos; o
   detector infere o schema pelo tamanho do modelo.

> **Regra de ouro:** um sinal só é classificado se houver **mãos**. Pose/face
> sozinhos não inferem — são *enriquecimento*, não substituição.

---

## 10. Como rodar / migrar para a V3

```powershell
# 1. Instalar o plugin 1.2.0 (do npm)
npm install expo-vision-camera-v4-mediapipe@1.2.0

# 2. Baixar os modelos de pose e face para assets/
#    (nomes EXATOS — é o que o plugin procura no prebuild)
#    pose:  pose_landmarker_lite.task
#    face:  face_landmarker.task
#    Fonte: https://ai.google.dev/edge/mediapipe/solutions/vision

# 3. Garantir enablePose/enableFace no app.json (ver §4)

# 4. Regerar o nativo (obrigatório — cria os landmarkers de pose/face)
npx expo prebuild --clean
npx expo run:android
```

Links diretos dos modelos (float16, MediaPipe):

| Modelo | Arquivo | URL |
|---|---|---|
| Mãos | `hand_landmarker.task` | `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task` |
| Corpo | `pose_landmarker_lite.task` | `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task` |
| Rosto | `face_landmarker.task` | `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task` |

> Sem o `prebuild --clean`, o nativo não cria os landmarkers de pose/face e o
> holístico não funciona, mesmo com o toggle ligado.

---

## 11. Pontos de atenção e próximos passos

- **CPU / FPS:** rosto (478 pts) + corpo a cada frame é pesado. O *throttle*
  atual é 100 ms (cam) / 50 ms (collect-dynamic). Medir FPS com holístico ligado
  e, se cair, afrouxar o intervalo ou reduzir a taxa.
- **Espelhamento:** `transformPoint` (`x = 1−y`, `y = 1−x`) é da câmera frontal e
  agora vale para todos os canais. Como a pose é normalizada por ombros no
  servidor, um espelhamento incorreto inverteria esquerda/direita do corpo —
  validar no overlay.
- **Volume de dados holísticos:** modelos `holistic_v1` precisam ser **treinados
  do zero** com amostras holísticas; os modelos `hands_v1` existentes não
  "viram" holísticos. A fase de crowdsourcing precisa coletar com o toggle ON.
- **Coleta estática holística:** hoje fora de escopo. Se sinais estáticos com
  expressão facial relevante surgirem, o `collect_static`/`StaticCollector` do
  backend precisaria evoluir para holístico (hoje só mãos).
- **Overlay de pose/face:** o app desenha apenas o esqueleto das mãos. Um modo de
  debug visualizando pose/face ajudaria a validar a captura.

---

*Documento da versão V3 do Li-Vision — reconhecimento holístico de Libras.*
