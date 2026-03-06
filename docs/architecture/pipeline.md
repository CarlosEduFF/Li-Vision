# Pipeline de Processamento

A **Pipeline** é o núcleo do Li-Vision.
Ela é responsável por transformar imagens capturadas pela webcam em **dados estruturados da mão**, permitindo que os detectores reconheçam letras da Libras.

Em termos simples:

```
Frame da câmera → Landmarks → Detectores → Letra
```

---

## 🎯 Responsabilidade da Pipeline

A pipeline possui três responsabilidades principais:

1. Capturar frames de vídeo
2. Executar o modelo de detecção de mãos
3. Retornar landmarks normalizados para o sistema de reconhecimento

Ela **não reconhece letras diretamente** — apenas fornece dados para os detectores.

Essa separação segue o princípio:

> **Single Responsibility Principle (SRP)**

---

## 🔄 Fluxo Geral

```mermaid
graph LR
A[Webcam Frame] --> B[Conversão BGR → RGB]
B --> C[MediaPipe HandLandmarker]
C --> D[Extração dos Landmarks]
D --> E[Lista de mãos detectadas]
E --> F[Detectores]
```

---

## 🧠 Conceito de Pipeline

Uma pipeline é uma sequência de etapas onde a saída de uma fase se torna a entrada da próxima.

No Li-Vision:

| Etapa             | Entrada   | Saída             |
| ----------------- | --------- | ----------------- |
| Captura           | Webcam    | Frame             |
| Pré-processamento | Frame     | RGB Image         |
| Inferência        | Imagem    | Landmarks         |
| Pós-processamento | Landmarks | Dados utilizáveis |

---

## 📦 Classe `HandPipeline`

Arquivo:

```
src/pipeline/hand_pipeline.py
```

A classe encapsula toda a comunicação com o MediaPipe.

### Objetivos da Classe

* Esconder complexidade do MediaPipe
* Padronizar saída de dados
* Permitir troca futura do modelo sem alterar o resto do sistema

---

## 🏗️ Estrutura Simplificada

```python
class HandPipeline:

    def __init__(self, model_path, num_hands=1):
        ...

    def process_frame(self, frame, timestamp):
        ...
        return hand_landmarks_list
```

---

## ⚙️ Inicialização

Durante a criação da pipeline:

1. O modelo `.task` é carregado
2. O HandLandmarker é configurado
3. O modo VIDEO é ativado

```python
HandLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=model_path),
    running_mode=VisionRunningMode.VIDEO
)
```

### Por que modo VIDEO?

O modo VIDEO:

* mantém estado entre frames
* melhora tracking
* reduz custo computacional

Ideal para aplicações em tempo real.

---

## 🎥 Método `process_frame`

Este é o método principal da pipeline.

### Entrada

* `frame` → imagem capturada pela webcam (OpenCV)
* `timestamp` → contador incremental necessário pelo MediaPipe

### Processos internos

#### 1️⃣ Espelhamento (opcional)

```python
frame = cv2.flip(frame, 1)
```

Melhora a experiência do usuário.

---

#### 2️⃣ Conversão de cor

OpenCV usa BGR, mas o MediaPipe usa RGB:

```python
rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
```

---

#### 3️⃣ Criação do MP Image

```python
mp.Image(
    image_format=mp.ImageFormat.SRGB,
    data=rgb
)
```

---

#### 4️⃣ Inferência do modelo

```python
result = landmarker.detect_for_video(image, timestamp)
```

O modelo retorna:

* landmarks da mão
* confiança da detecção
* múltiplas mãos (se habilitado)

---

#### 5️⃣ Retorno padronizado

A pipeline retorna:

```python
List[List[Landmark]]
```

Ou seja:

```
[
   [21 landmarks da mão 1],
   [21 landmarks da mão 2]
]
```

---

## ✋ Estrutura dos Landmarks

Cada landmark possui:

| Campo | Descrição                |
| ----- | ------------------------ |
| x     | posição horizontal (0–1) |
| y     | posição vertical (0–1)   |
| z     | profundidade relativa    |

Exemplo:

```python
landmark.x
landmark.y
landmark.z
```

As coordenadas são **normalizadas**, independentes da resolução da câmera.

---

## 🔌 Integração com Detectores

A pipeline não conhece letras.

Ela apenas fornece dados:

```python
hands = pipeline.process_frame(frame, ts)

for hand in hands:
    detector.detect(hand)
```

Isso permite adicionar novos detectores sem alterar a pipeline.

---


