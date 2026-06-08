# Configuração

A configuração principal do backend fica em `config.yaml` dentro das bases Python.

## App

| Campo | Exemplo | Função |
| --- | --- | --- |
| `app.camera_index` | `0` | Câmera padrão em execução local server-side. |
| `app.window_name` | `Li-Vision` | Nome de janela quando ha interface local OpenCV. |
| `app.run_mode` | `inference` | Modo geral: coleta, treino ou inferência, conforme fluxo usado. |

## Pipeline

| Campo | Exemplo | Função |
| --- | --- | --- |
| `pipeline.model_path` | `models/mediapipe/hand_landmarker.task` | Caminho do modelo MediaPipe. |
| `pipeline.num_hands` | `2` | Quantidade máxima de mãos processadas. |

## Detecção

| Campo | Exemplo | Função |
| --- | --- | --- |
| `detection.mode` | `rules` | Modo padrão de detecção. |
| `detection.min_score` | `0.7` | Score mínimo aceito pelo `DetectorManager`. |
| `detection.stability_frames` | `3` | Frames iguais exigidos antes de confirmar gesto. |
| `detection.cooldown_frames` | `10` | Frames de espera após gesto estabilizado. |

Modos suportados:

| Modo | Descrição |
| --- | --- |
| `rules` | Usa detectores geometricos. |
| `ml` | Usa modelos estáticos. |
| `dynamic_ml` | Usa modelos dinâmicos por sequência. |
| `hybrid` | Combina dinâmico, estático e regras. |

## Regras

| Campo | Função |
| --- | --- |
| `rules.enabled` | Habilita ou desabilita detectores por regra. |
| `rules.letters` | Lista de letras que devem ter detectores carregados. |

Exemplo:

```yaml
rules:
  enabled: true
  letters:
    - A
    - B
    - C
    - D
    - E
```

## ML estático

| Campo | Função |
| --- | --- |
| `ml.enabled` | Habilita modelos estáticos. |
| `ml.model_path` | Diretório dos arquivos `.joblib`. |
| `ml.confidence_threshold` | Confiança minima do detector estático. |

Modelos estáticos sao adequados para sinais sem trajetoria temporal relevante.

## ML dinâmico

| Campo | Função |
| --- | --- |
| `dynamic_ml.enabled` | Habilita modelos dinâmicos. |
| `dynamic_ml.model_path` | Diretório dos arquivos `.pt` ou `.joblib` legado. |
| `dynamic_ml.confidence_threshold` | Confiança minima do detector dinâmico. |
| `dynamic_ml.window_size` | Quantidade de frames por sequência. |

Modelos dinâmicos sao usados para sinais em que movimento e ordem dos frames importam.

## Entrada holistica

| Campo | Função |
| --- | --- |
| `holistic.default_feature_schema` | Schema base para novas coletas. |
| `holistic.pose.enabled` | Aceita canal de corpo quando enviado. |
| `holistic.face.enabled` | Aceita canal de rosto quando enviado. |

Schemas relevantes:

| Schema | Uso |
| --- | --- |
| `hands_v1` | Features baseadas em mãos. |
| `holistic_v1` | Features com mãos, pose e face. |

## Configuração do app

No aplicativo, a URL REST da API fica em `Li-Vision_App/config/api.ts`.

Padrão:

```ts
EXPO_PUBLIC_API_URL ?? "https://li-visionv2.onrender.com"
```

O WebSocket de gestos fica em `Li-Vision_App/services/gestureWebSocket.ts`.

Ao trocar ambiente, valide REST e WebSocket juntos.
