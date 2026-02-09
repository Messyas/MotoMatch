# Recommendation Service (FastAPI)

Microserviço responsável por processar critérios de busca e ranquear dispositivos. Ele não acessa banco de dados: todo o contexto necessário (critérios e specs dos dispositivos candidatos) deve ser enviado pelo backend Node.

## Execução

```bash
uvicorn recommendationService.main:app --reload
```

## Endpoint

`POST /ml/score-dispositivos`

### Request

```json
{
  "criterios": [
    { "tipo": "ram", "descricao": "8" },
    { "tipo": "preco_intervalo", "descricao": "1200-2000" }
  ],
  "dispositivos": [
    {
      "id": "uuid-1",
      "preco": 1599,
      "caracteristicas": [
        { "tipo": "ram", "descricao": "8" },
        { "tipo": "rom", "descricao": "256" },
        { "tipo": "battery", "descricao": "5000" }
      ],
      "aspect_scores": {
        "camera": 0.82,
        "bateria": 0.74
      }
    }
  ]
}
```

### Response

```json
{
  "scores": [
    {
      "id": "uuid-1",
      "finalScore": 0.87,
      "matchScore": 87,
      "perfilMatchPercent": 90,
      "criteriosMatchPercent": 85,
      "specFit": 0.85,
      "opinionSim": 0.9,
      "justificativas": [
        "Bateria confiável para a rotina",
        "Câmera boa para o dia a dia"
      ],
      "matchExplanation": {
        "specFit": 0.85,
        "opinionSim": 0.9,
        "weights": { "specs": 0.6, "reviews": 0.4 },
        "perCriterion": [
          { "tipo": "ram", "score": 1 },
          { "tipo": "preco_intervalo", "score": 0.92 }
        ]
      }
    }
  ]
}
```

## Integração com o backend Node

1. **Aplicar filtros no banco** usando Prisma (ex.: preço, RAM mínima) para reduzir o universo de candidatos.
2. **Montar o payload** com os critérios estruturados do usuário (mesmo formato usado hoje) e com a lista de dispositivos resultantes. Cada dispositivo precisa enviar:
   - `id`
   - `caracteristicas`: lista `{ tipo, descricao }` equivalente ao que vem do banco
   - `preco` numérico (opcional, mas recomendado)
   - `aspect_scores` já agregados (quando existir nota de reviews para câmera/bateria/etc.)
3. **Chamar o microserviço** via HTTP. Em caso de erro ou indisponibilidade, o backend pode manter o algoritmo heurístico atual como fallback.
4. **Ordenar e montar resposta final** no Node. Use `matchScore`/`finalScore` para ordenar, reaproveite `justificativas` e `matchExplanation`, salve histórico com `salvarHistorico` como ocorre hoje.

> Dica: é simples adicionar novos campos no payload (ex.: embeddings ou features adicionais). Basta mapear para `aspect_scores` ou para `caracteristicas` e o serviço irá recalcular automaticamente.

## Modelo de matching supervisionado

Para capturar nuances entre `specFit`, vetores de opinião e diferentes pesos, o serviço também pode usar um modelo de regressão (`HistGradientBoostingRegressor`). Esse modelo aprende a produzir o `finalScore` a partir de exemplos históricos (ou sintéticos) contendo as mesmas features que o motor calcula em tempo de execução. Se nenhum modelo estiver disponível no disco, o cálculo heurístico atual continua sendo usado como fallback.

### Formato dos dados de treino

O dataset precisa ser um CSV onde cada linha representa o par usuário-dispositivo já processado pelo motor, com as colunas abaixo:

| Coluna | Faixa esperada | Descrição |
| --- | --- | --- |
| `spec_fit` | 0-1 | Ajuste do dispositivo aos critérios estruturados (já considerando o fallback 0.5 quando não há critérios). |
| `opinion_sim` | 0-1 | Similaridade entre o vetor agregado do dispositivo e o alvo do usuário. |
| `camera`/`bateria`/`preco`/`desempenho` | 0-1 | Valores do `DeviceVector` após agregações por aspecto. |
| `has_structured` | {0,1} | Indica se havia critérios estruturados no caso. |
| `has_preference_targets` | {0,1} | Indica se conseguimos derivar preferências a partir dos critérios. |
| `includes_price` | {0,1} | Sinaliza se preço participou dos critérios. |
| `spec_weight` / `reviews_weight` | 0-1 | Pesos aplicados no cálculo heurístico daquele exemplo. |
| `target_score` | 0-1 | Label desejado (match final obtido via feedback humano ou gerado por LLM). |

Exemplo (CSV):

```csv
spec_fit,opinion_sim,camera,bateria,preco,desempenho,has_structured,has_preference_targets,includes_price,spec_weight,reviews_weight,target_score
0.78,0.82,0.74,0.71,0.62,0.79,1,1,1,0.7,0.3,0.85
0.50,0.91,0.83,0.77,0.60,0.84,0,1,0,0.0,1.0,0.80
```

### Como treinar e usar o modelo

1. Gere a base tabular seguindo o formato acima. Pode ser um mix de casos reais e sintéticos.
2. Execute o script CLI:

   ```bash
   python -m recommendationService.train_match_model --data-path data/matching_dataset.csv
   ```

   Use `--model-path` para salvar em outro local e `--target-column` caso utilize um nome diferente de `target_score`.

3. Garanta que o artefato `.joblib` esteja disponível em `recommendationService/models/device_matching_model.joblib` (ou defina a variável de ambiente `MATCHING_MODEL_PATH`).
4. Reinicie o serviço. A API irá carregar o modelo automaticamente e aplicar `predict` para definir `finalScore`.
