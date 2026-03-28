# Li-Vision (Edge Computing Architecture)

Sistema Oficial de **Reconhecimento de Gestos da Mão e LIBRAS** utilizando **Processamento em Borda (Vision Camera C++)**, **WebSocket Dinâmico (Zero Lag)** e **Redes Neurais Multicamadas (Scikit-Learn MLP)**.

Este projeto foi reestruturado computacionalmente para operar em Padrão-Ouro de arquitetura: processamento numérico de geometria espacial, dispensando envios de imagens complexas (Base64) e preservando RAM na nuvem.

> 🎓 **Para justificativas teóricas e matemáticas acadêmicas (TCC), leia o manifesto [ARQUITETURA_DEFINITIVA.md](ARQUITETURA_DEFINITIVA.md) na raiz do projeto.**

---

## 🛠️ Tecnologias Utilizadas

* **Python 3.10+ e FastAPI** (Core e WebSockets)
* **Scikit-Learn (MLPClassifier)** para treinamento do cérebro LIBRAS.
* **Numpy e Joblib**
* **React Native Vision Camera e TensorFlow Lite** (No App Mobile)

---

## 🏗️ Arquitetura do Projeto

```
src
│
├── api
│   └── routes
│       └── websocket_routes.py (Recebe JSON da Borda de Coordenadas 3D)
│
├── core
│   └── config_loader.py
│
├── data
│   └── collected (Central de Datasets .csv + backups automáticos)
│
├── detectors
│   ├── rule_detectors/ (Modelos Estáticos A-E Geométricos)
│   └── ml_detectors/ 
│       ├── static_detector.py
│       └── sequence_detector.py (Injeção Vetorial de 130 Features Absolutas e Relativas)
│
├── models
│   ├── static/
│   └── dynamic/ (Modelos .joblib da Rede Neural)
│
└── training
    └── sequence_trainer.py (Motor Treinador usando Rede Neural Sklearn)
```

---

## ⚙️ Modos do Sistema (Configurado em `config.yaml`)

Todo o comportamento dos algoritmos é orquestrado de maneira centralizada pelo seu `config.yaml`.

### Blocos de Detecção
* `rules`: Usa métricas algébricas exatas e distância entre os eixos (X, Y) para reconhecer as letras clássicas (A, B, C...).
* `ml`: Usa **Machine Learning** estático lendo 1 único frame no tempo para prever LIBRAS estáticas como Alfabeto de A-Z.
* `dynamic_ml`: Usa **Redes Neurais (MLP)** analisando um buffer temporal (Ex: últimos 15 quadros/frames) para ler a **rota e a trajetória geométrica** de gestos dinâmicos como "Oi" ou "Obrigado".

---

## 🗂️ Novo Gerenciador CLI de Datasets e Modelos

Seu sistema agora previne corrompimentos de dados usando uma Interface de Linha de Comando Intelectual. **Não misture gravações ruins com amostragem oficial.**

Para utilizar os coletores locais via Webcam Computador:

### 1️⃣ Coletar Dados (Collect)
```bash
python -m src.cli
```
**(Basta manter o `run_mode: "collect"` no construtor yaml)**
O Terminal escaneará seu disco e ordenará seus arquivos. Você escolhe se deseja anexar quadros à gravação `sequences.csv` antiga ou criar o `gestos_teste1.csv`, isolando o lixo. 

### 2️⃣ Treinar a Rede (Train)
Após gravar, mude para `run_mode: "train"` e chame o CLI novamente.
Ele criará a Inteligência Artificial e a arquivará como .joblib. Como proteção, ele automaticamente fará um snapshot e congelará uma cópia do CSV na pasta `backups/`.

---

## 🧬 Estrutura Espacial de Dados

Ao contrário de abordagens clássicas, O modelo processa 130 variáveis posicionais milimétricas por frame (usando o paradigma de Distância Relativa + Posicionamento Absoluto na Base da Palma - *vide arquitetura definitiva*):

```
1 frame = 130 variáveis  
1 buffer (15 frames) = 1950 features injetadas no MLP.
```

## ⚖️ Licença
Projeto acadêmico focado em experimentação tecnológica avançada. Cópia/alteração requer citações e fundamentação.
