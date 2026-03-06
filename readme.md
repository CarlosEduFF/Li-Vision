# Li-Vision

Sistema de **reconhecimento de gestos da mão utilizando OpenCV + MediaPipe**, com suporte para:

* Reconhecimento **baseado em regras**
* Reconhecimento **por Machine Learning**
* Reconhecimento **de gestos dinâmicos (sequência de movimentos)**

O projeto foi desenvolvido para experimentação com **gestos da Libras (Língua Brasileira de Sinais)** utilizando **visão computacional em tempo real**.

---

# Arquitetura do Projeto

```
src
│
├── core
│   └── config_loader.py
│
├── data
│   └── collected
│       └── sequences.csv
│
├── detectors
│   ├── rule detectors (A,B,C...)
│   └── ml_detector.py
│
├── models
│   └── hand_landmarker.task
│
├── recognition
│   ├── detector_factory.py
│   ├── detector_manager.py
│   └── sequence_gesture_detector.py
│
├── training
│   └── sequence_trainer.py
│
├── pipeline.py
└── cli.py
```

### Principais Componentes

| Componente                     | Função                               |
| ------------------------------ | ------------------------------------ |
| `cli.py`                       | Ponto de entrada da aplicação        |
| `pipeline.py`                  | Processamento de visão computacional |
| `detector_factory.py`          | Criação dinâmica de detectores       |
| `detector_manager.py`          | Orquestra múltiplos detectores       |
| `sequence_collector.py`        | Coleta de dados para treinamento     |
| `sequence_trainer.py`          | Treina modelo de gestos dinâmicos    |
| `sequence_gesture_detector.py` | Reconhecimento de sequências         |

---

# Tecnologias Utilizadas

* Python 3.10+
* OpenCV
* MediaPipe
* NumPy
* Scikit-Learn
* Joblib

---

# Instalação

Clone o projeto:

```
git clone https://github.com/CarlosEduFF/Li-Vision
cd li-vision
```

Instale as dependências:

```
pip install -r requirements.txt
```

---

# Executando o Sistema

O sistema é executado pelo **CLI principal**:

```
python -m src.cli
```

O comportamento da aplicação é controlado pelo **config.yaml**.

---

# Configuração do config.yaml

O arquivo `config.yaml` controla todo o funcionamento do sistema.

Exemplo:

```yaml
app:
  camera_index: 0
  window_name: "Li-Vision"
  run_mode: "collect"

pipeline:
  model_path: "src/models/hand_landmarker.task"
  num_hands: 2

detection:
  mode: "dynamic_ml"

rules:
  enabled:
    - A
    - B
    - C
    - D
    - E

ml:
  model_path: "models/gesture_rf.joblib"
  confidence_threshold: 0.75

dynamic_ml:
  model_path: "models/gesture_dynamic.joblib"
  confidence_threshold: 0.75
  window_size: 15
```

---

# Seção app

Define comportamento geral da aplicação.

| Campo          | Descrição                          |
| -------------- | ---------------------------------- |
| `camera_index` | Índice da câmera usada pelo OpenCV |
| `window_name`  | Nome da janela exibida             |
| `run_mode`     | Modo de execução                   |

### run_mode

| Valor       | Função                               |
| ----------- | ------------------------------------ |
| `collect`   | Coleta dados para treinamento        |
| `train`     | Treina modelo de gestos              |
| `inference` | Executa reconhecimento em tempo real |

---

# Seção pipeline

Configura o detector de mãos do MediaPipe.

| Campo        | Descrição                        |
| ------------ | -------------------------------- |
| `model_path` | Caminho do modelo MediaPipe      |
| `num_hands`  | Número máximo de mãos detectadas |

Exemplo:

```
num_hands: 2
```

Permite detectar **gestos com duas mãos**.

---

# Seção detection

Define qual tipo de detector será usado.

| Valor        | Descrição                          |
| ------------ | ---------------------------------- |
| `rules`      | Detectores baseados em regras      |
| `ml`         | Classificador de gestos estáticos  |
| `dynamic_ml` | Reconhecimento de gestos dinâmicos |

---

# Detectores Baseados em Regras

Usados para letras ou gestos simples.

```
rules:
  enabled:
    - A
    - B
    - C
```

Cada letra corresponde a um detector em:

```
src/detectors/
```

---

# Reconhecimento com Machine Learning

Modelo treinado com **RandomForest**.

```
ml:
  model_path: "models/gesture_rf.joblib"
  confidence_threshold: 0.75
```

---

# Reconhecimento de Gestos Dinâmicos

Usa sequência temporal de landmarks.

```
dynamic_ml:
  model_path: "models/gesture_dynamic.joblib"
  confidence_threshold: 0.75
  window_size: 15
```

### window_size

Número de frames usados para formar uma sequência.

Exemplo:

```
window_size = 15
```

Cada sequência contém:

```
15 frames × landmarks da mão
```

---

# Coletando Dados de Gestos

Configure:

```yaml
run_mode: collect
```

Execute:

```
python -m src.cli
```

Digite o nome do gesto:

```
OI
```

Controles:

| Tecla | Função           |
| ----- | ---------------- |
| SPACE | iniciar gravação |
| ESC   | sair             |

Cada sequência gravada é salva em:

```
src/data/collected/sequences.csv
```

---

# Treinando o Modelo

Configure:

```yaml
run_mode: train
```

Execute:

```
python -m src.cli
```

O modelo será salvo em:

```
models/gesture_dynamic.joblib
```

---

# Executando Reconhecimento

Configure:

```yaml
run_mode: inference
```

Execute:

```
python -m src.cli
```

A aplicação abrirá a webcam e exibirá o gesto detectado.

---

# Estrutura dos Dados

Cada frame contém:

```
21 landmarks
x,y,z
```

Cada mão possui:

```
63 features
```

Sequência com duas mãos:

```
126 features por frame
```

Com `window_size = 15`:

```
1890 features por sequência
```

---

# Recomendações para Treinamento

Para melhor precisão:

| Gesto  | Sequências |
| ------ | ---------- |
| mínimo | 80         |
| ideal  | 120        |

Grave gestos em:

* diferentes velocidades
* posições de mão
* distâncias da câmera
---

# Licença

Projeto para fins educacionais e experimentação com visão computacional.


Segue o trecho **formatado corretamente em Markdown (`.md`)** para você colar diretamente no final do `README.md`:

````md
## Padrões e decisões de design

As seguintes decisões arquiteturais foram adotadas para manter o projeto modular, extensível e com responsabilidades bem definidas.

### Strategy / Plugin Pattern

Cada letra é implementada como um **detector independente** (classe) que implementa o método:

```python
detect(landmarks) -> (label, score)
````

Isso permite registrar ou ativar detectores dinamicamente. Novos detectores podem ser adicionados sem alterar a lógica principal do sistema.

---

### Pipeline única

O componente **HandPipeline** encapsula:

* acesso à câmera
* criação do `mp.Image`
* execução do `HandLandmarker`

A aplicação consome apenas os **landmarks normalizados**, evitando dependências diretas com a camada de captura.

---

### Separação de responsabilidades

Os principais módulos possuem funções bem definidas:

| Componente    | Responsabilidade                    |
| ------------- | ----------------------------------- |
| `collector`   | Coleta e salva dados de landmarks   |
| `trainer`     | Treina modelos de Machine Learning  |
| `ml_detector` | Carrega e executa o modelo treinado |

Essa separação facilita manutenção, testes e evolução do projeto.

---

### Formato de dados

Os dados de treinamento são armazenados como **vetores de landmarks normalizados**:

* **63 dimensões**
* **21 pontos × (x, y, z)**

Formatos recomendados:

* `CSV`
* `NPZ`

Os valores são normalizados utilizando **proporções relativas à palma da mão**, aumentando a robustez contra variações de posição, rotação e escala.

---

### Extensibilidade

Adicionar suporte para uma nova letra pode ser feito de duas formas:

**1 — Detector heurístico**

* Implementar um novo detector
* Registrar no `detector_registry`

**2 — Detector baseado em Machine Learning**

* Coletar exemplos com `collector`
* Treinar o modelo com `trainer`
* Registrar o modelo no `ml_detector`

```

Se quiser, também posso te passar **mais duas seções que deixam README de projeto de visão computacional muito mais profissional**, por exemplo:

- **Arquitetura do sistema**
- **Fluxo de dados do pipeline**
- **Estrutura de diretórios comentada**

Essas três partes deixam o projeto **nível portfólio forte no GitHub**.
```
