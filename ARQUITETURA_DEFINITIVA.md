# Arquitetura Definitiva Padrão-Ouro (Li-Vision)

Este documento foi elaborado para fins acadêmicos e técnicos, de modo a explicar detalhadamente a transição de um aplicativo transmissor de imagem estática, para um motor de rede neural rápida baseada em Edge-Computing.

## 1. O Paradigma de Transmissão (Problema Resolvido)

Na versão antiga, o aplicativo era um **Streaming Burro**. A câmera lia o mundo, transformava as cores em uma `String Base64` gigantesca e despachava tudo isso pela internet (via WebSocket) para bater numa API que rodava as Redes Neurais localmente em um servidor gratuito.

* **Consequência:** Latência massiva (lentidão), imagens borradas (falhas no frame), congestionamento brutal de rede (4G chorava e derrubava quadros). Para a Língua Brasileira de Sinais, que depende do movimento suave e rastreável ("tempo"), a perda de um simples "quadro" no arruinou previsões de sinais como `Obrigado` e `Oi`.

## 2. A Solução: Edge Computing + Visão Computacional C++

Adotamos a **Edge Computing** (Computação de Borda). Isto significa que a carga de Visão Computacional não reside mais no servidor central. 

### Ferramentas no App (Frontend React Native):
- **`react-native-vision-camera`:** A biblioteca número um de câmera ultra-performática. Em vez de enviar vídeos, essa biblioteca permite acessarmos o _Buffer da Câmera_, em nível de hardware, usando a linguagem `C++`. 
- **Frame Processors (`react-native-worklets-core`):** Permitem que código Javascript rode em uma "Worklet" thread secundária que executa o `TensorFlow Lite (TFLite)` a insanos 60FPS. 
- **A Saída:** O celular sozinho vai isolar as coordenadas matemáticas da mão (`[{"x": 0.4, "y": 0.2}]`). O seu app agora se comunica mandando dados tão pequenos quanto uma simples mensagem de texto do WhatsApp.

## 3. A Matemática na API e a Rede Neural Temporal (Backend Inteligente)

Agora que a API recebe apenas marcações `(x, y, z)` instantaneamente, nós matamos o Gargalo de Rede. O gargalo passa a ser saber se o deficiente auditivo está gesticulando `Obrigado`, `Por favor`, `Te amo` (sequência de Frames Numéricos).

### Engenharia de Features (Física)
Antes, o modelo anterior do ScikitLearn olhava para a mão parada. Se a pessoa balançasse o braço do teto para o chão mantendo a mão aberta, o classificador achava que a pessoa estava estática (porque ele subtraía o referencial global nas fórmulas antigas do MediaPipe).
Injetamos **Vetores Relativos e Absolutos**: O `Pulso` fornece as posições matemáticas absolutas em relação à tela (x,y crus), enquanto detectamos com matemática de Delta:
- `Δx = x_atual - x_anterior` (Velocidade e Direção).

### Multi-Layer Perceptron (Rede Neural MLP)
No Python, foi abandonado o uso da árvore de decisão (`RandomForestClassifier`) e inserido a classe mais famosa de redes neurais do próprio ScikitLearn: **O MLP** (Perceptron Multicamadas).
- **Sem Keras/TensorFlow no Servidor:** Para evitar os famigerados "Out Of Memory Errors" de 500MB em servidores gratuitos, nós chamamos as poderosas funções derivadas de matrizes C do Scikit-Learn que treina as camadas invisíveis numéricas consumindo quase `0 de RAM`.
- Parametrizamos a **Retropropogação Adam** com a otimização em 1 ou 2 camadas densas rápidas (ex. `Ocultas=128, 64`), descobrindo de forma muito mais polida todos os agrupamentos não-lineares que definem a gramática da "LIBRAS", com mais flexibilidade contra deficiências, distância focal e espessura do braço.
