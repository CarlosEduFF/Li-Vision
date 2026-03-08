Abaixo está um **guia prático para testar sua API no Postman** com base nas rotas que existem no seu projeto.

Base URL da API:

```
https://li-vision.onrender.com
```

---

# 1️⃣ Ver estado da aplicação

### Endpoint

```
GET /admin/state
```

### URL completa

```
https://li-vision.onrender.com/admin/state
```

### Body

Nenhum.

### Exemplo de resposta

```json
{
  "run_mode": "inference",
  "detection": {
    "mode": "dynamic_ml",
    "min_score": 0.7,
    "stability_frames": 3,
    "cooldown_frames": 10
  }
}
```

Esse endpoint serve para **verificar em que modo o servidor está rodando**.

---

# 2️⃣ Alterar modo da aplicação

Permite alternar entre:

* `collect`
* `train`
* `inference`

### Endpoint

```
POST /admin/mode
```

### URL

```
https://li-vision.onrender.com/admin/mode
```

### Headers

```
Content-Type: application/json
```

### Body (JSON)

```json
{
  "run_mode": "inference"
}
```

### Exemplo de resposta

```json
{
  "ok": true,
  "run_mode": "inference"
}
```

---

# 3️⃣ Alterar modo de detecção

Permite trocar entre:

* `rules`
* `ml`
* `dynamic_ml`
* `hybrid`

### Endpoint

```
POST /admin/detection
```

### URL

```
https://li-vision.onrender.com/admin/detection
```

### Headers

```
Content-Type: application/json
```

### Body exemplo

```json
{
  "mode": "dynamic_ml"
}
```

### Body completo possível

```json
{
  "mode": "dynamic_ml",
  "ml_model_path": "models/static",
  "dynamic_model_path": "models/dynamic",
  "confidence_threshold": 0.9,
  "window_size": 15
}
```

### Resposta

```json
{
  "ok": true,
  "detection": {
    "mode": "dynamic_ml"
  }
}
```

---

# 4️⃣ Iniciar treinamento

Executa treinamento em **background**.

### Endpoint

```
POST /admin/train
```

### URL

```
https://li-vision.onrender.com/admin/train
```

### Body

Nenhum.

### Resposta

```json
{
  "ok": true,
  "status": "training_started"
}
```

---

# 5️⃣ Enviar imagem para detecção de gesto

Esse é o endpoint principal.

### Endpoint

```
POST /detect/detect
```

### URL

```
https://li-vision.onrender.com/detect/detect
```

### Body no Postman

Selecionar:

```
Body → form-data
```

Adicionar campo:

```
Key: file
Type: File
Value: (selecionar imagem)
```

### Exemplo de resposta

```json
{
  "gesture": "A",
  "confidence": 0.92
}
```

Ou

```json
{
  "gesture": null,
  "confidence": 0.0
}
```

---

# 6️⃣ Enviar imagem para coleta de dataset

Esse endpoint salva imagens para treinamento.

### Endpoint

```
POST /collect/
```

### URL

```
https://li-vision.onrender.com/collect/
```

### Body → form-data

Campo 1:

```
Key: label
Type: Text
Value: A
```

Campo 2:

```
Key: file
Type: File
Value: imagem.jpg
```

### Exemplo de resposta

```json
{
  "status": "saved",
  "label": "A"
}
```

---

# 7️⃣ Fluxo típico de uso da API

### 1. Colocar sistema em modo coleta

```
POST /admin/mode
```

```json
{
  "run_mode": "collect"
}
```

---

### 2. Coletar imagens

```
POST /collect/
```

---

### 3. Treinar modelo

```
POST /admin/train
```

---

### 4. Colocar em modo inferência

```
POST /admin/mode
```

```json
{
  "run_mode": "inference"
}
```

---

### 5. Detectar gestos

```
POST /detect/detect
```

---

# 8️⃣ Estrutura geral da API

```
Li-Vision API
│
├── Admin
│   ├── GET  /admin/state
│   ├── POST /admin/mode
│   ├── POST /admin/detection
│   └── POST /admin/train
│
├── Detection
│   └── POST /detect/detect
│
└── Dataset
    └── POST /collect/
```

---

💡 Se quiser, posso também te gerar um **arquivo de Collection do Postman (.json)** para importar diretamente no Postman com **todas essas requisições prontas**, o que facilita muito o teste da API.
