# Relatório - Documentação Li-Vision

## Resumo

Foi realizada uma análise estrutural das referências do projeto Li-Vision e a documentação oficial em `Li-Vision_Docs` foi reorganizada e expandida para explicar o projeto como um todo.

## Objetivo

Documentar o Li-Vision de forma geral e iniciar o detalhamento por arquitetura, módulos, fluxo de dados, API, aplicativo mobile, backend, detectores e visão computacional.

## Escopo

| Item | Status |
| --- | --- |
| Ler estrutura de `Li-Vision_API` | Executado |
| Ler estrutura de `Li-Vision_App` | Executado |
| Ler estrutura de `Li-Vision_Principal` | Executado |
| Ler estrutura de `Li-Vision_Docs` | Executado |
| Alterar somente `Li-Vision_Docs` | Executado |
| Alterar API/App/Principal | Não executado |

## Arquivos lidos

- `Li-Vision_Docs/mkdocs.yml`
- `Li-Vision_Docs/docs/index.md`
- `Li-Vision_Docs/docs/architecture/*`
- `Li-Vision_API/readme.md`
- `Li-Vision_API/config.yaml`
- `Li-Vision_API/src/api/server.py`
- `Li-Vision_API/src/api/app_state.py`
- `Li-Vision_API/src/api/user_session.py`
- `Li-Vision_API/src/api/routes/*`
- `Li-Vision_API/src/recognition/*`
- `Li-Vision_API/src/services/*`
- `Li-Vision_App/package.json`
- `Li-Vision_App/README.md`
- `Li-Vision_App/config/api.ts`
- `Li-Vision_App/services/api.ts`
- `Li-Vision_App/services/gestureWebSocket.ts`
- `Li-Vision_Principal/readme.md`

## Arquivos alterados

- `mkdocs.yml`
- `docs/index.md`
- `docs/getting-started.md`
- `docs/configuration.md`
- `docs/development.md`
- `docs/cli.md`
- `docs/faq.md`
- `docs/rule-based.md`
- `docs/architecture/overview.md`
- `docs/architecture/pipeline.md`
- `docs/architecture/folders.md`
- `docs/computer-vision/mediapipe.md`
- `docs/computer-vision/landmarks.md`
- `docs/computer-vision/hand_landmarker.md`
- `docs/detectors/overview.md`
- `docs/detectors/rule-based.md`
- `docs/detectors/ml-detector.md`

## Arquivos criados

- `docs/architecture/data-flow.md`
- `docs/modules/backend-api.md`
- `docs/modules/mobile-app.md`
- `docs/modules/principal.md`
- `docs/api-reference.md`
- `docs/reports/2026-06-08_documentacao-li-vision_v1.md`

## Arquivos removidos

Nenhum arquivo foi removido. Alguns arquivos existentes foram substituidos por conteudo novo via patch textual.

## Comandos executados

- Listagem das referências do projeto.
- Listagem recursiva de arquivos relevantes.
- Leitura de arquivos de documentação, configuração, rotas, serviços e manifests.
- Consulta de status Git em `Li-Vision_Docs`.
- Criação do diretório `docs/reports`.

## Resultado

A documentação agora possui:

- visão geral do sistema;
- mapa dos diretórios;
- arquitetura em camadas;
- fluxo de dados de inferência, coleta e treinamento;
- paginas por módulo;
- referência consolidada da API;
- explicacao dos modos de detecção;
- paginas de MediaPipe, landmarks e Hand Landmarker;
- guia de configuração, desenvolvimento, CLI e FAQ.

## Riscos encontrados

| Risco | Observação |
| --- | --- |
| `Li-Vision_API` e `Li-Vision_Principal` semelhantes | Pode haver divergência futura se um for alterado sem o outro. |
| WebSocket com URL própria no app | REST e WebSocket precisam ser alinhados ao trocar ambiente. |
| Documentação antiga com mojibake | Conteudos substituidos foram reescritos em UTF-8 legivel. |
| CLI não validada funcionalmente | Documentação mantida como uso conceitual por falta de execução especifica. |

## Testes executados

- `mkdocs build --strict`: não executado com sucesso porque `mkdocs` não está instalado/reconhecido no ambiente.
- `python -m mkdocs build --strict`: não executado com sucesso por falha de execução do Python no ambiente atual.
- Validação alternativa de navegação: todos os arquivos referenciados em `mkdocs.yml` existem.
- Busca de padrões comuns de mojibake: sem ocorrências nos arquivos documentais atuais.
- Busca de termos sensíveis/perigosos: ocorrências encontradas apenas em contexto documental legítimo, como `token` em autenticação e rotas administrativas.

## Proximo passo recomendado

Instalar ou disponibilizar MkDocs no ambiente e executar `mkdocs build --strict`; depois, revisar visualmente o site para confirmar navegação, Mermaid, tabelas e links internos.
