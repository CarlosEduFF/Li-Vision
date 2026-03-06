# 🧠 Arquitetura do Sistema — Visão Geral

O **Li-Vision** é um sistema de visão computacional projetado para reconhecimento de letras da Língua Brasileira de Sinais (LIBRAS) utilizando processamento em tempo real da câmera.

A arquitetura foi construída de forma modular para separar captura, detecção, processamento e reconhecimento.

---

## 🔄 Fluxo Geral do Sistema

O processamento segue o seguinte pipeline:

```
Câmera
   ↓
MediaPipe
   ↓
Landmarks da mão
   ↓
DetectorManager
   ↓
Reconhecimento da letra (LIBRAS)
```

---

## 📷 1. Captura da Câmera

A aplicação inicia a captura de vídeo em tempo real utilizando **OpenCV**.

Responsabilidades:

* acessar webcam do dispositivo
* capturar frames continuamente
* enviar imagens para o pipeline de processamento

Arquivo principal relacionado:

```
src/app.py
```

---

## ✋ 2. Detecção de Mãos (MediaPipe)

Cada frame capturado é processado pelo **MediaPipe Hands**, responsável por localizar a mão na imagem.

Funções principais:

* detectar presença da mão
* rastrear movimento em tempo real
* extrair pontos anatômicos da mão

Saída do módulo:

```
21 pontos (landmarks) da mão
```

Arquivo relacionado:

```
src/hand_detect.py
```

---

## 📍 3. Extração de Landmarks

Os landmarks representam coordenadas tridimensionais:

* posição dos dedos
* articulações
* orientação da mão

Exemplo conceitual:

```
Polegar → (x, y, z)
Indicador → (x, y, z)
...
```

Esses dados são transformados em vetores numéricos para análise posterior.

---

## 🧩 4. DetectorManager

O `DetectorManager` atua como o **orquestrador do reconhecimento**.

Responsabilidades:

* receber landmarks normalizados
* selecionar detectores ativos
* aplicar regras ou modelos treinados
* consolidar resultados

Diretório relacionado:

```
src/detectors/
```

Ele permite adicionar novos detectores sem alterar o restante do sistema.

---

## 🔤 5. Reconhecimento da Letra (LIBRAS)

Após o processamento, o sistema classifica o gesto detectado em uma letra da LIBRAS.

O reconhecimento pode ocorrer via:

* regras geométricas (rule-based)
* modelos de Machine Learning treinados
* classificação baseada em features

Diretório principal:

```
src/recognition/
```

Resultado final:

```
Letra reconhecida → exibida em tempo real
```

---

## 🏗️ Organização dos Módulos

```
src/
│
├── core/           → lógica central do sistema
├── data/           → datasets e modelos treinados
├── detectors/      → detectores de gestos
├── models/         → estruturas de ML
├── recognition/    → classificação das letras
│
├── app.py          → ponto de entrada da aplicação
├── pipeline.py     → fluxo de processamento
├── trainer.py      → treinamento de modelos
└── utils.py        → funções auxiliares
```

---

## ⚙️ Pipeline Interno

O pipeline executa continuamente:

1. Captura frame da câmera
2. Detecta mão
3. Extrai landmarks
4. Normaliza dados
5. Executa detectores
6. Classifica gesto
7. Exibe resultado

Esse ciclo ocorre várias vezes por segundo, permitindo reconhecimento em tempo real.

---

## 🎯 Objetivos da Arquitetura

* ✅ Modularidade
* ✅ Facilidade de expansão
* ✅ Separação de responsabilidades
* ✅ Suporte a múltiplos métodos de reconhecimento
* ✅ Processamento em tempo real

---

## 🚀 Extensibilidade

Novos gestos podem ser adicionados criando:

* novos detectores em `detectors/`
* novos modelos em `models/`
* novas estratégias em `recognition/`

Sem modificar o pipeline principal.

---

## 📌 Resumo

O Li-Vision transforma imagens capturadas pela câmera em informação semântica (letras da LIBRAS) através de um pipeline de visão computacional estruturado e extensível.

```
Imagem → Pontos → Features → Classificação → Letra
```
