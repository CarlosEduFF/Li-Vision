# CLI

As bases Python possuem arquivos de entrada como `src/cli.py` e `src/interfaces/cli.py`. A documentação original cita comandos de modo, mas a validação final deve sempre ser feita contra o código atual antes de automatizar uso em produção.

## Uso esperado

Execute comandos a partir do diretório da base Python:

```bash
cd Li-Vision_API
python -m src.cli
```

ou, se o arquivo for chamado diretamente no ambiente:

```bash
python src/cli.py
```

## Operações comuns

| Operação | Forma conceitual | Função |
| --- | --- | --- |
| Selecionar modo | `mode rules` / `mode ml` / `mode dynamic_ml` / `mode hybrid` | Alternar estrategia de detecção. |
| Inferência | `inference` | Executar reconhecimento. |
| Coleta | `collect` | Coletar amostras para dataset. |
| Treino | `train` | Treinar modelos a partir de amostras. |

## Modos

| Modo | Quando usar |
| --- | --- |
| `rules` | Testes rapidos e letras cobertas por heuristicas. |
| `ml` | Gestos estáticos treinados. |
| `dynamic_ml` | Gestos com movimento. |
| `hybrid` | Cenario mais completo, combinando estrategias. |

## Validação segura

Antes de depender da CLI:

1. Verifique `python --version`.
2. Ative o ambiente virtual.
3. Instale `requirements.txt`.
4. Rode um comando de ajuda, se existir.
5. Confirme que `config.yaml` aponta para modelos existentes.

## Observação

Para operação do produto mobile, o caminho principal é a API FastAPI com app Expo. A CLI deve ser tratada como interface auxiliar de desenvolvimento, coleta ou diagnóstico local.
