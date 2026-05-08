# Evolução da Arquitetura de Inteligência Artificial: Li-Vision

Este documento traça o caminho percorrido pelo motor de reconhecimento de gestos da plataforma Li-Vision, desde seus primórdios até a arquitetura avançada de hoje.

## Fase 1: Abordagem Básica (Regras, Heurísticas e Árvores)

No começo da concepção do projeto ou em abordagens de tutoriais introdutórios, o reconhecimento de libras geralmente é feito usando distâncias engessadas.

*   **Tecnologia Comum:** Regras estáticas (`if dedo_indicador_levantado and polegar_dobrado`) ou Machine Learning raso como **Árvores de Decisão** / *Random Forest*.
*   **Como funcionava:** Medíamos as distâncias de um landmark do MediaPipe até outro para adivinhar a letra.
*   **Limitação Crítica:** Para o corpo humano, cada mão é de um tamanho. Para a câmera digital, se você vai mais pra perto da tela, a "mão" dobra de tamanho no eixo XY. Árvores de decisão lidam mal com isso a não ser que os dados fossem rigorosamente normalizados.

## Fase 2: A Rede Neural Simples (MLP em Scikit-Learn)

Para dar inteligência à arquitetura, adicionou-se a base do *Machine Learning* moderno. Um **Multilayer Perceptron (MLP)**.

*   **Tecnologia:** `sklearn.neural_network.MLPClassifier`.
*   **Como funcionava:** Para qualquer foto (frame) recebida, extraíamos as coordenadas da mão, centralizávamos nela mesma e jogávamos um vetor de números em uma rede neural com 128 neurônios em uma camada, e 64 neurônios na segunda. 
*   **A Ruptura do "Dinâmico":** Para prever o movimento, acumulávamos 15 frames e colávamos um no outro formando um vetor achatado.
*   **Limitação Crítica:** Embora ótimo para letras paradas, quando achatávamos 15 posições da mão ao longo do tempo (total de 630 a 1950 features), a rede apenas decorava a posição do vetor, não que havia acontecido um movimento da posição A para B. Se você fizesse o movimento ao contrário, o modelo provavelmente ficava confuso. Outro problema era o grave *overfitting* (a rede não tinha mecanismos de parada automática, ela apenas rodava todas as épocas e "decorava" a resposta de quem treinou, falhando para mãos desconhecidas).

## Fase 3: Estado da Arte (Arquitetura Híbrida e Espaço-Temporal)

A rede neural anterior chegou no limite lógico de eficiência. Para resolver isso, implementamos a verdadeira arquitetura de borda e Machine Learning de nível de Produção, dividindo a responsabilidade do cérebro.

### Cérebro Estático (Otimizado)
As letras paradas (A, B, C...) não precisam de complexidade excessiva, apenas de defesas matemáticas.
*   **Early Stopping:** Agora a rede separa sozínha 15% das fotos gravadas e as esconde. Durante o treino, ela tenta adivinhar essas fotos escondidas. Se ela começar a piorar (Overfitting), ela para de treinar na hora.
*   **Escudo L2:** Implementamos Regularização (Alpha), fazendo o modelo ser "podado" para ter generalização melhor, não engolindo pontos fora da curva das câmeras sujas.

### Cérebro Dinâmico (Redes Recorrentes Espaço-Temporais)
O movimento precisa da compreensão da matriz do tempo. Descartamos o MLP aqui e implementamos Arquitetura PyTorch Profunda.
*   **O Escolhido: GRU Bidirecional (Gated Recurrent Unit)**
*   **Diferença Vital:** O Gated Recurrent Unit tem "memória celular". Ele lê o frame 1 e anota, lê o 2 comparando se a mão acelerou, até ler o quadro 15. Ao mesmo tempo, ele faz o caminho Inverso (Bidirecional) lendo a fita toda de trás para frente. 
*   **O Resultado:** Gestos de varredura ou que possuem profundidade com a câmera passam a gerar um padrão inconfundível. Uma pessoa passando a mão p/ direita veloz ou devagar ainda disparará o gatilho da GRU da mesma forma, porque ela mapeou a linha do tempo, independente do frame isolado.

> [!NOTE]  
> A GRU (que é a prima da famosíssima LSTM - *Long Short Term Memory*) exige menos da CPU do Servidor gratuito do que a LSTM mantendo praticamente os mesmos ganhos estatísticos sobre janelas muito pequenas de tempo (como nossos 15 frames).

---

## E o Aplicativo (Frontend / React Native)?

O app Mobile **não necessita de NADA DE ALTERAÇÃO** relativa a esta transição arquitetural. 

**Por que não?**
Imagine o APP como o entregador de cartas do correio e o Frontend ML MediaPipe do projeto de vocês como o pacote, a única coisa que os servidores pediram pra que ocorra no aplicativo é : *"Me mande a sacola de dados processados em um Array de forma X y z por WebSocket"*.

O App já estava fazendo o papel corretamente enviando pela constante `gestureWS.sendLandmarks(transformedHands)` um pacote de array para cada frame lido do fluxo expô do media pipe da camera.

É tarefa exclusiva do novo **Modelo Cache da API Python em Nuvem** receber este array de 100kb pela internet, engavetar ele, perguntar *"está configurado modo híbrido e com modelo dinâmico?"*, invocar a camada **LSTM/GRU PyTorch** e responder o pacote `{"gesture": "M"}` de volta em tempo real no socket aberto.

Toda cirurgia pesada já ocorreu atrás das cortinas do servidor!
