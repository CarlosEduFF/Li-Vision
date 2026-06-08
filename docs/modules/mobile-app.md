# Aplicativo mobile

`Li-Vision_App` é a referência do aplicativo Expo/React Native do Li-Vision. Ele é a interface principal para tradução, coleta de dados, treinamento, aprendizado e administração.

## Stack

| Tecnologia | Uso |
| --- | --- |
| Expo `~54` | Toolchain e runtime mobile. |
| React Native `0.81` | Interface mobile. |
| Expo Router | Navegação baseada em arquivos. |
| React Native Vision Câmera | Acesso a câmera. |
| MediaPipe via plugin Expo | Extração local de landmarks. |
| WebSocket | Comunicacao de baixa latencia com a API. |
| Async Storage | Persistência local de token e dados simples. |
| i18next | Internacionalizacao. |
| Jest | Testes unitarios. |

## Estrutura

```text
Li-Vision_App/
  app/
    (tabs)/
    screens/
    _layout.tsx
  components/
  config/
  constants/
  context/
  features/
  hooks/
  lib/
  services/
  styles/
```

## Navegação

O app usa `expo-router`, portanto arquivos dentro de `app/` definem rotas.

| Área | Exemplos |
| --- | --- |
| Abas principais | Início, aprender, studio, perfil e transcrição. |
| Telas de usuário | Login, registro, editar perfil, ranking e detalhes de gesto. |
| Telas de IA/dados | Câmera, coleta estatica, coleta dinamica, treino, modelos e datasets. |
| Telas administrativas | Configuração administrativa e gestão de aprendizado. |

## Comunicacao com a API

O arquivo `config/api.ts` define a base da API:

```ts
EXPO_PUBLIC_API_URL ?? "https://li-visionv2.onrender.com"
```

Isso permite trocar o backend por variável de ambiente sem editar código.

## WebSocket de gestos

`services/gestureWebSocket.ts` concentra a conexão em tempo real.

Recursos implementados:

| Recurso | Descrição |
| --- | --- |
| URL padrão | `wss://li-visionv2.onrender.com/ws/detect`. |
| Modos | `hybrid`, `rules`, `ml`, `dynamic_ml`. |
| Reconexão | Backoff exponencial com teto de 30 segundos. |
| Controle | Envio de ações como `set_mode`, `start_collect` e `stop_collect`. |
| Inferência leve | Envio de landmarks JSON em vez de frames pesados. |

## Fluxo de tradução no app

1. A tela de câmera solicita permissão.
2. O frame da câmera e processado localmente para extrair landmarks.
3. O app envia os landmarks pelo WebSocket.
4. A API retorna gesto, confiança e modo.
5. A UI atualiza a transcrição.
6. O usuário pode usar voz, soletramento ou continuar coletando sinais.

## Features organizadas

| Pasta | Função |
| --- | --- |
| `features/auth` | Login, registro, sessão e tipos de usuário. |
| `features/profile` | Perfil do usuário. |
| `features/learning` | Gestos educacionais e conteudo de aprendizado. |
| `features/ranking` | Ranking de contribuidores. |
| `features/training` | Datasets, treino e administração de modelos. |

## Internacionalizacao

O app contem arquivos de tradução em `services/locales/`:

```text
de.json
en.json
es.json
fr.json
já.json
pt.json
```

Essa estrutura indica suporte planejado ou implementado para multiplos idiomas de interface.

## Testes

O app possui configuração Jest e testes existentes para:

| Arquivo | Escopo |
| --- | --- |
| `services/__tests__/api.test.ts` | Funcoes de API como detecção e estado. |
| `app/__tests__/_layout.test.tsx` | Comportamento de layout/autenticação. |

Comando documentado:

```bash
npm test
```

## Pontos de atenção

- Recursos de câmera e MediaPipe exigem development build; Expo Go pode não suportar tudo.
- Alterar o contrato do WebSocket exige atualizacao simultanea no backend.
- Telas de coleta e treino dependem de autenticação e disponibilidade da API.
- A URL hardcoded do WebSocket deve ser mantida alinhada com `EXPO_PUBLIC_API_URL` se o ambiente mudar.
