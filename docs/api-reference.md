# Referência da API

Esta página resume os endpoints encontrados em `Li-Vision_API/src/api/routes` e no servidor principal.

Base padrão usada pelo aplicativo:

```text
https://li-visionv2.onrender.com
```

WebSocket padrão:

```text
wss://li-visionv2.onrender.com/ws/detect
```

## Saúde

| Metodo | Rota | Função |
| --- | --- | --- |
| `GET` | `/healthz` | Retorna status simples da API. |

## Detecção

| Metodo | Rota | Função |
| --- | --- | --- |
| `POST` | `/detect/` | Recebe imagem via upload e retorna gesto, confiança e modo. |
| `WS` | `/ws/detect` | Recebe landmarks ou frames e retorna detecção em tempo real. |

Query params aceitos no WebSocket:

| Parametro | Função |
| --- | --- |
| `mode` | Define `rules`, `ml`, `dynamic_ml` ou `hybrid`. |
| `model` | Filtra modelo ativo por nome. |
| `use_rules` | Habilita/desabilita regras na sessão. |

Ações aceitas no WebSocket:

| Acao | Campos principais | Função |
| --- | --- | --- |
| `set_mode` | `mode`, `use_rules` | Altera modo da sessão ativa. |
| `start_collect` | `label`, `dataset_name`, `user_id` | Inicia coleta dinamica. |
| `stop_collect` | - | Encerra coleta dinamica. |

## Administração

| Metodo | Rota | Função |
| --- | --- | --- |
| `GET` | `/admin/state` | Consulta estado/configuração atual. |
| `POST` | `/admin/rules` | Altera habilitacao global de regras. |
| `POST` | `/admin/mode` | Altera modo de execução. |
| `POST` | `/admin/detection` | Altera modo de detecção. |
| `POST` | `/admin/train` | Dispara fluxo administrativo de treino. |
| `GET` | `/admin/export-samples` | Exporta amostras. |
| `POST` | `/admin/import-samples` | Importa amostras. |

## Autenticação e perfil

| Metodo | Rota | Função |
| --- | --- | --- |
| `POST` | `/auth/register` | Registra usuário. |
| `POST` | `/auth/login` | Autentica usuário. |
| `POST` | `/auth/refresh` | Atualiza token/sessão. |
| `GET` | `/auth/profile` | Busca perfil. |
| `PUT` | `/auth/profile` | Atualiza perfil. |
| `POST` | `/auth/profile/upload-avatar` | Envia avatar. |

## Coleta e datasets

| Metodo | Rota | Função |
| --- | --- | --- |
| `POST` | `/collect/static` | Salva amostra estatica. |
| `POST` | `/collect/dynamic/start` | Inicia coleta dinamica REST. |
| `POST` | `/collect/dynamic/stop` | Encerra coleta dinamica REST. |
| `GET` | `/collect/datasets` | Lista datasets. |
| `GET` | `/collect/datasets/{dataset_id}/stats` | Consulta estatísticas do dataset. |
| `GET` | `/collect/ranking` | Lista ranking de contribuidores. |
| `DELETE` | `/collect/datasets/{dataset_id}` | Remove dataset. |
| `PUT` | `/collect/datasets/{dataset_id}` | Renomeia/atualiza dataset. |
| `DELETE` | `/collect/datasets/{dataset_id}/labels/{label}` | Remove amostras de um label. |
| `PUT` | `/collect/datasets/{dataset_id}/labels/{label}` | Renomeia/atualiza label. |

## Treinamento e modelos

| Metodo | Rota | Função |
| --- | --- | --- |
| `POST` | `/train/start` | Inicia treinamento. |
| `GET` | `/train/status/by-model/{model_name}` | Consulta status por modelo. |
| `GET` | `/train/status/{job_id}` | Consulta job de treino. |
| `GET` | `/train/models` | Lista modelos. |
| `POST` | `/train/activate` | Ativa modelo treinado. |

## Aprendizado

| Metodo | Rota | Função |
| --- | --- | --- |
| `GET` | `/learning/gestures` | Lista gestos educacionais. |
| `GET` | `/learning/gestures/{gesture_id}` | Detalha gesto. |
| `POST` | `/learning/gestures` | Cria gesto. |
| `PUT` | `/learning/gestures/{gesture_id}` | Atualiza gesto. |
| `DELETE` | `/learning/gestures/{gesture_id}` | Remove gesto. |
| `POST` | `/learning/gestures/upload-image` | Envia imagem de gesto. |

## Contratos importantes

- Endpoints de remoção em `/collect` afetam dados persistidos e devem ser protegidos por UI, autenticação e confirmacao.
- WebSocket é usado para tradução em tempo real; alterações nele exigem ajuste no app.
- Treinamento depende de amostras suficientes; a API retorna erro quando o dataset não atende ao mínimo.
