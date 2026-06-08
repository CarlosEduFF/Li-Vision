# Detectores rule-based

Detectores rule-based reconhecem gestos usando relacoes geométricas entre landmarks.

Eles sao uteis para:

- prototipagem rápida;
- letras com formato bem definido;
- explicabilidade;
- fallback quando modelos treinados não estao disponíveis.

## Estrutura

Os detectores ficam em:

```text
src/detectors/rule_detectors/
```

Exemplos encontrados:

```text
rule_a.py
rule_b.py
rule_c.py
rule_d.py
rule_e.py
rule_engine.py
```

## Registro

Os detectores sao registrados em mapas como:

```python
RULE_MAP = {
    "A": RuleADetector,
    "B": RuleBDetector,
    "C": RuleCDetector,
    "D": RuleDDetector,
    "E": RuleEDetector,
}
```

Esse mapa aparece na criação de detectores e na sessão de usuário.

## Como uma regra decide

Uma regra pode avaliar:

| Sinal geometrico | Exemplo |
| --- | --- |
| Dedos abertos/fechados | Ponta do dedo acima/abaixo de articulacoes. |
| Distancia entre pontos | Polegar perto do indicador. |
| Curvatura | Dedo dobrado ou estendido. |
| Orientacao relativa | Posicao da mão em relacao ao pulso. |

## Vantagens

| Vantagem | Descrição |
| --- | --- |
| Interpretavel | E possível explicar por que uma letra foi reconhecida. |
| Leve | Não depende de modelo treinado. |
| Rápido | Bom para tempo real. |

## Limitacoes

| Limitacao | Impacto |
| --- | --- |
| Sensível a variacao | Pessoas sinalizam com diferencas naturais. |
| Escala mal para muitos sinais | Muitas regras ficam dificeis de manter. |
| Dificil para movimento | Trajetorias sao melhor tratadas por modelo dinâmico. |

## Ao adicionar uma nova regra

1. Crie o detector.
2. Garanta retorno `(label, score)`.
3. Registre no `RULE_MAP`.
4. Adicione a letra em `config.yaml`.
5. Teste caso positivo, negativo, mão parcial, baixa confiança e gesto parecido.
