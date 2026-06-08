# Landmarks

Landmarks sao pontos numericos que representam partes da mão, do corpo ou do rosto.

Para mãos, o MediaPipe retorna 21 pontos por mão.

## Campos

| Campo | Descrição |
| --- | --- |
| `x` | Coordenada horizontal normalizada. |
| `y` | Coordenada vertical normalizada. |
| `z` | Profundidade relativa. |

## Por que usar landmarks

| Beneficio | Impacto |
| --- | --- |
| Menos dados | Enviar landmarks e muito mais leve que enviar imagem. |
| Mais estabilidade | Detectores trabalham com geometria, não pixels crus. |
| Tempo real | Vetores pequenos sao rapidos de processar. |
| ML viavel | Features numericas alimentam modelos estáticos e dinâmicos. |

## Exemplo

```json
{ "x": 0.42, "y": 0.31, "z": -0.02 }
```

## Mãos, pose e face

O Li-Vision aceita:

| Canal | Uso |
| --- | --- |
| Mãos | Principal para sinais de Libras. |
| Pose | Complementa sinais que usam corpo. |
| Face | Complementa sinais que usam expressao facial. |

O schema `hands_v1` usa mãos. O schema `holistic_v1` combina mãos com canais adicionais.
