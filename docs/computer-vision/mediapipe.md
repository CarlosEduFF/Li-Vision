# MediaPipe

MediaPipe é usado para detectar pontos anatômicos da mão e transformar imagem em dados numericos.

No Li-Vision, o modelo principal e:

```text
hand_landmarker.task
```

## Papel no sistema

MediaPipe não traduz Libras diretamente. Ele fornece landmarks. A tradução acontece depois, nos detectores.

```mermaid
flowchart LR
    I[Imagem] --> M[MediaPipe]
    M --> L[Landmarks]
    L --> D[Detectores]
    D --> G[Gesto]
```

## Onde roda

| Local | Uso |
| --- | --- |
| App mobile | Caminho preferencial: extrai landmarks no dispositivo. |
| Backend | Caminho alternativo para imagem/frame recebido pela API. |

## Vantagens

- reduz dependência de pixels crus;
- gera coordenadas normalizadas;
- suporta tempo real;
- permite enviar dados leves pela rede.

## Arquivos relacionados

| Local | Função |
| --- | --- |
| `Li-Vision_App/assets/hand_landmarker.task` | Modelo usado pelo app. |
| `Li-Vision_API/models/mediapipe/hand_landmarker.task` | Modelo usado pelo backend. |
| `src/vision/pipeline.py` | Encapsula MediaPipe na API/base Python. |
