# Motor de IA — Li-Vision

Este documento descreve a evolução do motor de reconhecimento de gestos do Li-Vision, as decisões técnicas que levaram à arquitetura híbrida atual e a engenharia de features que alimenta os modelos.

---

## Visão Geral da Arquitetura Atual

O motor opera com dois classificadores especializados rodando em paralelo no backend Python:

| Modelo | Tecnologia | Entrada | Uso |
|--------|-----------|---------|-----|
| MLP (Multilayer Perceptron) | Scikit-Learn | Coordenadas normalizadas (1 frame) | Sinais estáticos — letras e sinais sem movimento |
| GRU Bidirecional | PyTorch | Sequência de 15 frames + deltas | Sinais dinâmicos — gestos com trajetória temporal |

---

## Evolução: as Três Fases

### Fase 1 — Regras e Árvores de Decisão *(descartada)*

A abordagem inicial usava regras estáticas baseadas em distâncias entre landmarks do MediaPipe para inferir letras — por exemplo: `if indicador_levantado and polegar_dobrado → letra D`. Modelos de Machine Learning raso como `RandomForestClassifier` foram avaliados nesta fase.

**Por que foi descartada:** regras baseadas em distâncias absolutas falhavam ao mudar a distância focal da câmera ou o tamanho da mão. Quando o usuário se aproxima da câmera, as coordenadas XY mudam proporcionalmente. Sem normalização rigorosa, o modelo confundia escala com gesto — e a normalização necessária era frágil o suficiente para falhar com frequência em condições reais.

---

### Fase 2 — MLP Scikit-Learn *(ativo para sinais estáticos)*

Para superar as limitações das regras estáticas, foi adotado um `MLPClassifier` do Scikit-Learn com duas camadas densas (128 e 64 neurônios). O modelo recebia as coordenadas da mão normalizadas pelo pulso como ponto de referência zero, eliminando a dependência de posição absoluta na tela.

Para sinais dinâmicos, a estratégia era acumular 15 frames consecutivos e achatá-los em um único vetor de entrada.

**Limitações identificadas:**

**Ausência de memória temporal:** ao achatar os 15 frames em um vetor, o modelo perdia a noção de sequência. Ele aprendia a posição de cada elemento no vetor, não que havia ocorrido um deslocamento de A para B. Gestos executados na ordem inversa produziam vetores semelhantes, causando confusões sistemáticas.

**Overfitting sem controle:** o `MLPClassifier` do Scikit-Learn, sem configuração de Early Stopping, executava todas as épocas de treinamento sem separar dados de validação. A rede memorizava os dados de quem treinou o modelo e falhava ao generalizar para mãos e câmeras desconhecidas.

**Por que permanece ativo para sinais estáticos:** para letras e sinais sem movimento, o MLP é suficiente e tem vantagens operacionais críticas. Opera sobre as matrizes C nativas do Scikit-Learn com consumo de memória próximo a zero — essencial para o limite de 512 MB de RAM do servidor gratuito. Treina rapidamente e não requer PyTorch.

---

### Fase 3 — Arquitetura Híbrida com GRU Bidirecional *(estado atual)*

A Fase 3 divide a responsabilidade em dois módulos especializados e corrige as limitações de ambas as fases anteriores.

#### Cérebro estático: MLP otimizado

O MLP da Fase 2 recebeu dois mecanismos que resolvem o problema de overfitting:

**Early Stopping:** 15% das amostras são reservadas automaticamente como conjunto de validação oculto. A cada época de treinamento, o modelo tenta prever esse conjunto. Ao detectar piora no desempenho de validação — sinal de que a rede começou a memorizar em vez de generalizar — o treinamento é interrompido, preservando o estado do modelo no ponto de melhor performance.

**Regularização L2 (parâmetro Alpha):** penaliza coeficientes muito grandes na rede, forçando o modelo a distribuir a importância entre os neurônios em vez de depender de poucos. O efeito prático é maior robustez a mãos de formatos diferentes, câmeras com distorções e variações de iluminação.

---

#### Cérebro dinâmico: GRU Bidirecional em PyTorch

A GRU (Gated Recurrent Unit) é uma arquitetura de rede neural recorrente com mecanismo de memória seletiva. Diferente do MLP, que recebe todos os frames simultaneamente como um vetor achatado, a GRU os processa em sequência — mantendo um estado interno que acumula o histórico do movimento e decidindo, a cada frame, o que deve ser lembrado e o que pode ser descartado.

**Configuração bidirecional:** duas instâncias da GRU processam a mesma sequência em direções opostas — uma do frame 1 ao 15, outra do frame 15 ao 1. As representações de ambas as direções são combinadas na classificação final. Isso permite que o modelo compreenda o gesto tanto pelo seu início quanto pelo seu desfecho, tornando gestos que se distinguem pela direção do movimento inconfundíveis entre si.

**Por que GRU e não LSTM?**

A LSTM (Long Short-Term Memory) é a arquitetura recorrente mais conhecida da mesma família, mas possui três gates internos contra dois da GRU. Para janelas temporais curtas como os 15 frames utilizados no Li-Vision, os ganhos estatísticos de ambas as arquiteturas são equivalentes. A GRU foi escolhida por ter menos parâmetros, reduzindo o consumo de CPU e memória no servidor — crítico para o ambiente de hospedagem gratuita atual.

---

## Engenharia de Features

A representação matemática dos dados de entrada foi reformulada na Fase 3 para capturar informações que a abordagem anterior não conseguia expressar.

### O problema com a Fase 2

O MLP da Fase 2 usava coordenadas normalizadas pelo pulso como único referencial. Subtrair continuamente o pulso de todos os landmarks eliminava a posição absoluta da mão — o modelo não conseguia detectar que ela havia se deslocado no espaço, apenas via a sua configuração em cada instante.

### Dois tipos de vetores por frame

Cada frame enviado ao backend contém agora dois tipos de informação:

**Vetores relativos — forma da mão:**
Coordenadas de cada landmark normalizadas pelo pulso, preservando a configuração da mão independente de posição e escala na tela. Alimentam o MLP para classificação de sinais estáticos.

**Vetores absolutos e de delta temporal — movimento:**
Posição bruta do pulso na tela (x, y absolutos em relação ao frame) e suas variações entre frames consecutivos:

```
Δx = x_atual − x_anterior
Δy = y_atual − y_anterior
```

Os deltas codificam velocidade e direção do movimento. Alimentam a GRU para classificação de sinais dinâmicos.

### O que isso resolve na prática

| Caso | Fase 2 | Fase 3 |
|------|--------|--------|
| Gesto para esquerda vs. direita | Confundia | Distingue pelos deltas |
| Mesmo gesto rápido vs. devagar | Confundia | GRU mapeia trajetória, não velocidade |
| Gestos com mesma posição final mas trajetórias diferentes | Confundia | GRU distingue pelo caminho percorrido |
| Letras estáticas com câmeras diferentes | Overfitting | Early Stopping + L2 generalizam |
