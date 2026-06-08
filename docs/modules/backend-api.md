# Backend API

`Li-Vision_API` é a referência da API Python do Li-Vision. Ela usa FastAPI para expor endpoints REST e WebSocket, além de orquestrar visão computacional, detectores, coleta, treinamento e integração com Supabase.

## Responsabilidades

| Responsabilidade | Descrição |
| --- | --- |
| Inferência | Recebe imagem ou landmarks e retorna gesto reconhecido com confiança. |
| WebSocket em tempo real | Mantem conexão contínua para tradução em tempo real. |
| Sessoes isoladas | Cria `UserSession` por conexão para evitar contaminacao de estado entre usuários. |
| Coleta de dados | Registra amostras estaticas e sequências dinamicas em datasets. |
| Treinamento | Treina modelos estáticos e dinâmicos a partir das amostras. |
| Gestão de modelos | Lista, ativa e baixa modelos treinados. |
| Aprendizado | Gerencia gestos educacionais exibidos no aplicativo. |
| Autenticação | Registra, autentica, atualiza perfil e avatar de usuários. |

## Estrutura principal

```text
Li-Vision_API/
  config.yaml
  requirements.txt
  src/
    api/
      server.py
      app_state.py
      user_session.py
      holistic.py
      routes/
    core/
      config_loader.py
      model_cache.py
      supabase_client.py
    data_collection/
    detectors/
      rule_detectors/
      ml_detectors/
    recognition/
    services/
    training/
    vision/
```

## Inicializacao da API

O ponto central e `src/api/server.py`.

Na inicializacao:

1. A aplicação FastAPI é criada com titulo `Li-Vision API`.
2. O `AppState` global inicia a pipeline MediaPipe.
3. O cache global de modelos e carregado.
4. As rotas de administração, detecção, coleta, treinamento, WebSocket, autenticação e aprendizado sao registradas.

## AppState

`AppState` mantem somente recursos compartilhados:

| Recurso | Motivo |
| --- | --- |
| `config` | Configuração padrão carregada de `config.yaml`. |
| `pipeline` | Instancia compartilhada do `HandPipeline`. |
| `collection_service` | Serviço REST de coleta estatica. |
| `training_service` | Serviço de treinamento. |
| `ModelCache` | Cache global de modelos ML. |
| `rules_enabled` | Estado global de regras lógicas, persistido quando possível. |

O estado temporal por usuário não fica no `AppState`; ele fica em `UserSession`.

## UserSession

`UserSession` é criada por conexão WebSocket ou por request temporario de detecção. Ela constroi os detectores conforme:

| Entrada | Efeito |
| --- | --- |
| `detection_mode` | Define `rules`, `ml`, `dynamic_ml` ou `hybrid`. |
| `active_model_name` | Filtra o modelo carregado por nome. |
| `use_rules` | Controla se regras lógicas entram no modo híbrido. |

Cada sessão possui seu próprio `DetectorManager`, histórico, cooldown e buffer de coleta.

## DetectorManager

O `DetectorManager` executa detectores e estabiliza o resultado:

1. Recebe um frame holistico ou lista de mãos.
2. Executa detectores de sequência no frame completo.
3. Executa detectores estáticos/regra por mão.
4. Seleciona o melhor label por score.
5. Aplica score mínimo.
6. Exige estabilidade por alguns frames.
7. Aplica cooldown para evitar repeticao excessiva.

## Modos de detecção

| Modo | O que carrega |
| --- | --- |
| `rules` | Detectores geometricos A, B, C, D e E configurados. |
| `ml` | Modelos estáticos `.joblib`. |
| `dynamic_ml` | Modelos dinâmicos `.pt` ou `.joblib` legado. |
| `hybrid` | Dinâmicos, estáticos e regras, respeitando flags de configuração. |

## Serviços

| Serviço | Função |
| --- | --- |
| `DetectionService` | Decodifica imagem, executa pipeline e chama `DetectorManager`. |
| `CollectionService` | Salva amostras estaticas e dinamicas em datasets. |
| `TrainingService` | Treina modelos, registra jobs, salva artefatos e ativa modelos. |

## Dependencias Python

O arquivo `requirements.txt` lista dependências de visão computacional, API e ML, incluindo FastAPI, OpenCV, MediaPipe, NumPy, pandas, scikit-learn, joblib, PyTorch e Supabase conforme o ambiente do projeto.

## Observacoes de manutenção

- Alterações em contrato de WebSocket devem ser refletidas no app e nesta documentação.
- Mudanças em `config.yaml` podem afetar todos os modos de detecção.
- Alterações em features de coleta precisam preservar compatibilidade com modelos já treinados.
- Operações destrutivas de dataset devem manter confirmacao no cliente e validação no backend.
