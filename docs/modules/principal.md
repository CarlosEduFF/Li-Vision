# Li-Vision_Principal

`Li-Vision_Principal` é uma referência Python muito semelhante a `Li-Vision_API`. Pela estrutura observada, ela funciona como variação principal do backend, mantendo os mesmos módulos de API, visão, detectores, coleta, treinamento e modelos.

## Papel no conjunto

| Papel possível | Evidência na estrutura |
| --- | --- |
| Referência principal do backend | Possui `readme.md`, `Requests.md`, `config.yaml`, `Dockerfile` e `src/`. |
| Variação de desenvolvimento | Contém modelos, datasets e arquivos gerados em uso local. |
| Espelho funcional da API | Repete rotas, serviços, detectores e pipeline encontrados em `Li-Vision_API`. |

## Estrutura

```text
Li-Vision_Principal/
  config.yaml
  Dockerfile
  Requests.md
  readme.md
  datasets/
  docs/
  models/
    dynamic/
    mediapipe/
  src/
    api/
    core/
    data_collection/
    detectors/
    interfaces/
    recognition/
    services/
    training/
    vision/
```

## Relação com Li-Vision_API

As duas referências compartilham nomes e responsabilidades. Isso sugere uma separação histórica entre:

- uma versão principal do projeto;
- uma versão voltada à API/deploy.

Antes de mudar código em qualquer uma delas, é importante comparar os arquivos correspondentes para evitar corrigir apenas um lado e deixar divergência funcional.

## O que documentar quando houver evolução

Sempre que `Li-Vision_Principal` divergir de `Li-Vision_API`, registre:

| Item | Por que importa |
| --- | --- |
| Diferença de `config.yaml` | Pode mudar modo, modelo, número de mãos ou schema de features. |
| Diferença em rotas | Pode quebrar o app se a versão deployada for outra. |
| Diferença em detectores | Pode gerar reconhecimento diferente para o mesmo gesto. |
| Diferença em treinamento | Pode gerar modelos incompatíveis com a inferência. |
| Diferença em datasets/modelos | Pode afetar resultados e reprodutibilidade. |

## Recomendação operacional

Use `Li-Vision_API` como referência para o backend consumido pelo app e trate `Li-Vision_Principal` como variação relacionada que precisa permanecer sincronizada ou ter sua função formalmente definida.
