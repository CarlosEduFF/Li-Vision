# Hand Landmarker

O Hand Landmarker é o modelo do MediaPipe responsável por detectar mãos e retornar landmarks.

## Configuração no backend

No `config.yaml`:

```yaml
pipeline:
  model_path: "models/mediapipe/hand_landmarker.task"
  num_hands: 2
```

## Saída

A saída esperada é uma lista de mãos:

```text
[
  [21 landmarks da mão 1],
  [21 landmarks da mão 2]
]
```

## Uso no app

O app possui o arquivo:

```text
assets/hand_landmarker.task
```

Esse caminho permite extrair landmarks no dispositivo, reduzindo o volume enviado para a API.

## Cuidados

- O arquivo `.task` precisa existir no ambiente que executa a inferência.
- A configuração de número de mãos deve combinar com o comportamento esperado do app.
- Mudanças no modelo podem alterar landmarks e impactar detectores.
