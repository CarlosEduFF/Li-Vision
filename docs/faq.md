# FAQ

## A câmera não abre

Possíveis causas:

- permissão de câmera negada;
- outro aplicativo usando a câmera;
- emulador sem câmera configurada;
- uso do Expo Go em fluxo que exige development build.

No app mobile, recursos nativos de câmera e MediaPipe devem ser testados em development build.

## A mão não e detectada

Verifique:

- iluminacao do ambiente;
- mão inteira visivel;
- distancia adequada da câmera;
- modelo `hand_landmarker.task` presente;
- `pipeline.num_hands` configurado corretamente.

## A API responde, mas não reconhece gesto

Possíveis causas:

- modo selecionado não possui detectores carregados;
- modelo ativo não existe no cache;
- score abaixo de `detection.min_score`;
- `stability_frames` ainda não foi atingido;
- landmarks enviados em formato invalido.

## O WebSocket desconecta

O app possui reconexão automatica com backoff. Em hospedagens gratuitas, conexões ociosas podem ser encerradas pelo provedor.

Se a queda for constante, valide:

- URL do WebSocket;
- conectividade do dispositivo;
- logs da API;
- formato das mensagens enviadas.

## O treinamento falha por amostras insuficientes

O `TrainingService` exige quantidade minima de amostras. Para modelos reais, o mínimo tecnico não basta: colete variedade por usuário, iluminacao, angulo e velocidade.

## O modelo dinâmico não funciona após treinar

Verifique:

- se o arquivo `.pt` foi salvo/baixado;
- se o `feature_schema` do dataset combina com a inferência;
- se `window_size` e tamanho do vetor sao compatíveis;
- se o modo ativo e `dynamic_ml` ou `hybrid`.

## O app usa a API errada

REST usa `EXPO_PUBLIC_API_URL` ou o valor padrão em `config/api.ts`. O WebSocket de gestos também precisa apontar para o ambiente correto em `services/gestureWebSocket.ts`.

## Posso apagar datasets ou modelos antigos?

Não sem confirmacao e backup. Datasets e modelos fazem parte da rastreabilidade do treinamento. Remoções devem ser planejadas, confirmadas e documentadas.
