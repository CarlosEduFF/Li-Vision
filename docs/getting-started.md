# 🚀 Getting Started

Este guia apresenta os passos necessários para configurar e executar o projeto **Li-Vision** localmente.

---

## 📋 Requisitos

Antes de iniciar, certifique-se de possuir os seguintes softwares instalados:

* **Python 3.10 ou superior**
* **pip** (gerenciador de pacotes do Python)
* Sistema operacional:

  * Windows 10+
  * Linux
  * macOS

Recomenda-se também:

* Ambiente virtual (`venv`)
* Editor de código (VS Code recomendado)

---

## 📦 Dependências do Projeto

O projeto utiliza bibliotecas voltadas para visão computacional, processamento de dados e machine learning:

* `opencv-python` — captura e processamento de imagens e vídeo
* `mediapipe` — detecção e rastreamento de mãos
* `numpy` — operações matemáticas e arrays
* `pandas` — manipulação de dados
* `scikit-learn` — treinamento de modelos de ML
* `joblib` — serialização e carregamento de modelos

---

## ⚙️ Instalação

### 1️⃣ Clonar o repositório

```bash
git clone https://github.com/seu-usuario/li-vision.git
cd li-vision
```

---

### 2️⃣ Criar ambiente virtual (recomendado)

#### Windows

```bash
python -m venv .venv
.venv\Scripts\activate
```

#### Linux / macOS

```bash
python3 -m venv .venv
source .venv/bin/activate
```

---

### 3️⃣ Instalar dependências

Execute:

```bash
pip install -r requirements.txt
```

Isso instalará automaticamente todas as bibliotecas necessárias.

---

## ▶️ Execução

Após a instalação, execute a aplicação com:

```bash
python src/app.py
```

Se tudo estiver configurado corretamente:

* a câmera será iniciada
* o sistema começará a detectar gestos da mão
* o reconhecimento da língua de sinais será ativado

---

## ✅ Verificação rápida

Caso ocorra algum erro, valide:

```bash
python --version
pip list
```

Verifique se as seguintes bibliotecas aparecem na lista:

* opencv-python
* mediapipe
* numpy
* pandas
* scikit-learn
* joblib

---

## 🧩 Estrutura esperada do projeto

```
li-vision/
│
├── src/
│   └── app.py
├── requirements.txt
└── docs/
```

---

## 🛠️ Problemas comuns

### Câmera não inicia

* Verifique permissões do sistema operacional.
* Feche outros aplicativos que utilizem a webcam.

### Erro ao instalar MediaPipe (Windows)

Atualize o pip:

```bash
python -m pip install --upgrade pip
```

---

## 🚀 Próximos passos

Após executar o projeto com sucesso:

* Consulte a seção **Arquitetura** para entender o funcionamento interno.
* Veja a documentação da **API de reconhecimento**.
* Explore exemplos de uso e treinamento do modelo.
