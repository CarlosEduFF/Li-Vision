# Desenvolvimento

Esta página descreve como evoluir o projeto com menor risco de quebrar fluxos existentes.

## Antes de alterar

Verifique:

| Pergunta | Motivo |
| --- | --- |
| A mudança e no app, API, Principal ou Docs? | Evita edicao fora de escopo. |
| O contrato REST/WebSocket muda? | Exige atualizar app e docs. |
| A mudança afeta features de modelo? | Pode invalidar datasets/modelos existentes. |
| Existe teste ou smoke test aplicavel? | Evita regressao silenciosa. |
| `Li-Vision_API` e `Li-Vision_Principal` precisam ficar sincronizados? | Evita divergência entre bases Python. |

## Criar novo detector por regra

Fluxo recomendado:

1. Criar um arquivo em `src/detectors/rule_detectors/`, por exemplo `rule_f.py`.
2. Herdar ou seguir o contrato de `BaseDetector`.
3. Implementar `detect(hand)` retornando `(label, score)`.
4. Exportar o detector em `src/detectors/rule_detectors/__init__.py`.
5. Registrar no `RULE_MAP` em `src/recognition/detector_factory.py` e em `src/api/user_session.py`.
6. Adicionar a letra em `config.yaml` dentro de `rules.letters`.
7. Testar com landmarks representativos.

Contrato esperado:

```python
def detect(self, hand):
    return "F", 0.95
```

## Adicionar modelo estático

1. Coletar amostras estaticas suficientes.
2. Treinar modelo pelo fluxo de treinamento.
3. Salvar/ativar artefato `.joblib`.
4. Garantir que o arquivo esteja em `models/static`.
5. Usar modo `ml` ou `hybrid`.

## Adicionar modelo dinâmico

1. Coletar sequências dinamicas com janela consistente.
2. Confirmar schema de features usado no dataset.
3. Treinar modelo GRU pelo `TrainingService`.
4. Ativar modelo para baixar o artefato `.pt`.
5. Usar modo `dynamic_ml` ou `hybrid`.

## Alterar contrato do WebSocket

Se precisar alterar `/ws/detect`, atualize em conjunto:

| Local | O que revisar |
| --- | --- |
| `Li-Vision_API/src/api/routes/websocket_routes.py` | Entrada, ações e resposta. |
| `Li-Vision_App/services/gestureWebSocket.ts` | Tipos, envio e parse da resposta. |
| Telas que usam gestos | Estados de erro, loading e reconexão. |
| Esta documentação | `api-reference.md` e `architecture/data-flow.md`. |

## Alterar coleta de features

Mudanças em features sao sensíveis porque podem quebrar modelos existentes.

Antes de mudar:

- documente o schema novo;
- preserve leitura de schemas antigos quando possível;
- atualize treinamento e inferência juntos;
- registre se datasets antigos precisam ser recriados.

## Testes recomendados

| Área | Validação |
| --- | --- |
| Docs | `mkdocs build` |
| App | `npm test` |
| API | iniciar FastAPI e testar `/healthz` |
| WebSocket | conectar, enviar landmarks validos e receber resposta |
| Coleta | criar amostra estatica e dinamica em ambiente controlado |
| Treino | rodar com dataset pequeno conhecido |

## Regras de preservacao

- Não remova detectores existentes para simplificar.
- Não enfraqueca thresholds sem justificar.
- Não altere schema de features sem compatibilidade ou migracao.
- Não troque URL de produção sem configurar ambiente.
- Não apague datasets/modelos sem confirmacao explicita.
