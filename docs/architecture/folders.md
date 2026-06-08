# Estrutura de referências

Esta página explica como os nomes com `_` são usados como referências para variações do mesmo repositório. Eles não devem ser lidos como uma separação definitiva de produtos nem como dependência de um caminho local específico.

## Referências principais

```text
Li-Vision/
  Li-Vision_API/
  Li-Vision_App/
  Li-Vision_Docs/
  Li-Vision_Principal/
```

| Referência | Função |
| --- | --- |
| `Li-Vision_API` | Referência da API FastAPI usada para inferência, coleta, treinamento e dados. |
| `Li-Vision_App` | Referência do aplicativo mobile Expo/React Native. |
| `Li-Vision_Docs` | Referência da documentação MkDocs. |
| `Li-Vision_Principal` | Referência principal/base Python relacionada ao backend. |

## Referência Li-Vision_API

```text
Li-Vision_API/
  datasets/
  docs/
  models/
  src/
  config.yaml
  Dockerfile
  requirements.txt
```

| Item | Função |
| --- | --- |
| `src/api` | FastAPI, rotas, estado global e sessões. |
| `src/core` | Configuração, Supabase e cache de modelos. |
| `src/data_collection` | Conversão de landmarks em features e coleta. |
| `src/detectors` | Detectores por regra e por ML. |
| `src/recognition` | Fábrica e orquestrador de detectores. |
| `src/services` | Serviços de detecção, coleta e treinamento. |
| `src/training` | Treinadores auxiliares. |
| `src/vision` | Pipeline MediaPipe. |
| `models` | Modelos estáticos, dinâmicos e MediaPipe usados pela referência. |
| `datasets` | Dados de apoio/datasets da referência. |
| `config.yaml` | Configuração de app, pipeline, detecção e schemas. |

## Referência Li-Vision_App

```text
Li-Vision_App/
  app/
  components/
  config/
  constants/
  features/
  hooks/
  lib/
  services/
  styles/
```

| Item | Função |
| --- | --- |
| `app` | Rotas e telas definidas pelo Expo Router. |
| `components` | Componentes reutilizáveis da interface. |
| `config` | Configurações como URL base da API. |
| `constants` | Constantes de tema, níveis e domínio. |
| `features` | Módulos por domínio: auth, profile, learning, ranking e training. |
| `hooks` | Hooks reutilizáveis. |
| `lib` | Utilitários de HTTP e storage. |
| `services` | Integração com API, WebSocket, i18n e voz. |
| `styles` | Arquivos de estilo por tela e componentes compartilhados. |

## Referência Li-Vision_Docs

```text
Li-Vision_Docs/
  docs/
  mkdocs.yml
```

| Item | Função |
| --- | --- |
| `mkdocs.yml` | Configuração do site, tema e navegação. |
| `docs/index.md` | Entrada da documentação. |
| `docs/architecture` | Arquitetura, pipeline, fluxo e referências estruturais. |
| `docs/modules` | Documentação por variação do repositório. |
| `docs/computer-vision` | Conceitos de MediaPipe e landmarks. |
| `docs/detectors` | Detectores por regra e ML. |

## Referência Li-Vision_Principal

`Li-Vision_Principal` possui estrutura equivalente a `Li-Vision_API`, com `src`, `models`, `datasets`, `docs`, `config.yaml`, `Dockerfile` e `requirements.txt`.

Ao alterar futuramente o backend, compare as referências relacionadas para decidir se a mudança deve ser aplicada em mais de uma variação do repositório.
