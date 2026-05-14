# Contribuindo com o Li-Vision

**Fase atual:** o aplicativo está completo. A prioridade agora é alimentar os modelos de IA com amostras de gestos. Quanto mais amostras coletadas — de pessoas diferentes, com câmeras diferentes, em condições de luz diferentes — mais preciso o modelo será ao reconhecer LIBRAS no mundo real.

Este documento explica como contribuir com dados, quais cuidados tomar durante a coleta e como o material enviado é usado pelo sistema.

---

## Por que a coleta de dados importa

Os modelos de IA do Li-Vision (MLP para sinais estáticos e GRU para sinais dinâmicos) ainda não foram treinados com dados reais em volume suficiente. Eles só aprenderão a generalizar — isto é, a reconhecer corretamente gestos de pessoas que nunca viram antes — quando tiverem amostras de:

- Mãos de tamanhos e formatos diferentes
- Diferentes distâncias da câmera
- Diferentes velocidades de execução do sinal
- Diferentes condições de iluminação
- Regionalismos e variações do mesmo sinal

Cada amostra que você envia ajuda diretamente nessa generalização.

---

## Como contribuir

### Pré-requisitos

- Ter o aplicativo instalado com um **development build** (não o Expo Go)
- Estar cadastrado e autenticado no sistema
- Boa iluminação no ambiente (evite contraluz)

---

### Coleta de sinais estáticos

Sinais estáticos são letras do alfabeto e sinais que não envolvem movimento — a mão fica em uma posição fixa.

**Acesse:** ML Studio → Gerenciar Datasets → selecione o gesto → Coletar amostra estática

**Processo:**
1. Posicione a mão dentro da área de enquadramento indicada na tela
2. Mantenha a posição por 2–3 segundos até o sistema confirmar a captura
3. Repita o mesmo gesto **pelo menos 20 vezes** por sessão, variando levemente o ângulo e a distância da câmera
4. Se possível, colete em ambientes com iluminação diferente (luz natural, luz artificial, ambiente escuro)

**O que evitar:**
- Não mantenha a mão completamente parada e rígida — variações naturais ajudam o modelo
- Não colete o mesmo gesto 20 vezes do mesmo ângulo exato; varie a posição da câmera
- Não colete com a mão fora do quadro ou parcialmente cortada

---

### Coleta de sinais dinâmicos

Sinais dinâmicos envolvem movimento — a mão se desloca no espaço ao longo do tempo. São os mais importantes para a fase atual, pois o modelo dinâmico (GRU) ainda tem menos dados que o estático.

**Acesse:** ML Studio → Gerenciar Datasets → selecione o gesto → Coletar amostra dinâmica

**Processo:**
1. Leia a descrição do gesto antes de gravar
2. Pressione o botão de gravação e execute o movimento completo
3. Cada gravação captura uma sequência de 15 frames (~0,5 segundo)
4. Grave **pelo menos 30 amostras** por gesto, variando:
   - Velocidade de execução (lento, normal, rápido)
   - Posição inicial da mão na tela (centralizado, levemente deslocado)
   - Distância da câmera

**O que evitar:**
- Não interrompa o movimento no meio — execute o sinal completo em cada gravação
- Não colete gestos que você não domina — amostras incorretas degradam o modelo
- Evite movimentos bruscos da câmera durante a gravação

---

## Metas de volume de dados

Para que o treinamento produza um modelo com generalização adequada, estas são as metas mínimas por gesto:

| Tipo de sinal | Amostras mínimas | Meta ideal |
|---------------|-----------------|------------|
| Estático (letra/sinal fixo) | 100 amostras | 300+ amostras |
| Dinâmico (gesto com movimento) | 150 amostras | 500+ amostras |

Quanto mais colaboradores diferentes contribuírem para o mesmo gesto, melhor — diversidade de contribuidores é mais valiosa que volume de um único contribuidor.

---

## Boas práticas gerais

**Iluminação:** prefira luz frontal ou lateral. Evite contraluz (janela atrás de você) — o MediaPipe tem dificuldade para detectar landmarks com contraluz forte.

**Fundo:** fundos neutros (paredes lisas) ajudam, mas não são obrigatórios. O modelo precisa aprender a funcionar em ambientes reais.

**Velocidade:** execute os sinais na velocidade natural da sua fala em LIBRAS. Amostras artificialmente lentas ou rápidas reduzem a qualidade do dataset.

**Consistência:** ao coletar um gesto, certifique-se de estar executando o sinal correto. Em caso de dúvida sobre a execução, consulte o módulo de Aprendizado do aplicativo (aba Aprender) para visualizar a descrição e representação do gesto antes de coletar.

---

## O que acontece com as amostras coletadas

1. As amostras são enviadas ao backend e armazenadas no dataset associado ao gesto
2. Quando o volume mínimo for atingido, a equipe dispara um ciclo de treinamento via ML Studio
3. O modelo treinado é avaliado com o conjunto de validação (amostras separadas automaticamente)
4. Se a acurácia for satisfatória, o modelo é publicado como ativo via tela de seleção de modelo
5. O modelo ativo passa a ser usado na tela de tradução em tempo real para todos os usuários

---

## Reportando problemas na coleta

Se o aplicativo não detectar a mão durante a coleta, verifique:
- Iluminação suficiente no ambiente
- Mão totalmente dentro do quadro de enquadramento
- Permissão de câmera concedida ao aplicativo nas configurações do dispositivo

Para bugs ou comportamentos inesperados no fluxo de coleta, abra uma issue no repositório descrevendo o dispositivo, o sistema operacional e os passos para reproduzir o problema.
