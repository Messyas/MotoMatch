"""Constantes usadas pelo motor de recomendação (pesos, labels, mapeamentos)."""

from typing import Dict

from .types import PreferenceAspect

TARGET: Dict[str, float] = {
  "basica": 0.3,
  "básica": 0.3,
  "ok": 0.5,
  "media": 0.5,
  "média": 0.5,
  "boa": 0.75,
  "top": 0.9,
}

LEVEL_TO_SCORE: Dict[str, float] = {
  "basica": 0.3,
  "ok": 0.5,
  "boa": 0.75,
  "top": 0.9,
}

ASPECT_JUSTIFICATION_LABELS: Dict[PreferenceAspect, Dict[str, str]] = {
  "camera": {
    "strong": "Câmera excelente para fotos e vídeos",
    "good": "Câmera boa para o dia a dia",
  },
  "bateria": {
    "strong": "Bateria que dura muito",
    "good": "Bateria confiável para a rotina",
  },
  "desempenho": {
    "strong": "Desempenho ótimo para jogos e multitarefas",
    "good": "Desempenho fluido para o cotidiano",
  },
  "preco": {
    "strong": "Ótimo custo-benefício na faixa que você definiu",
    "good": "Mantém o orçamento que você pediu",
  },
}

CRITERION_ASPECT_HINT: Dict[str, PreferenceAspect] = {
  "battery": "bateria",
  "main_camera": "camera",
  "secondary_camera": "camera",
  "tertiary_camera": "camera",
  "front_camera": "camera",
  "camera": "camera",
  "benchmark": "desempenho",
  "ram": "desempenho",
  "rom": "desempenho",
  "processor": "desempenho",
  "preco_intervalo": "preco",
  "preco": "preco",
  "price": "preco",
  "custo": "preco",
}

CRITERION_FALLBACK_JUSTIFICATION: Dict[str, str] = {
  "screen_size": "Tela no tamanho que você pediu",
  "refresh_rate": "Tela fluida com taxa de atualização alta",
  "texto_livre": "",
}

NUMERIC_CRITERIA_TYPES = {
  "screen_size",
  "ram",
  "rom",
  "battery",
  "benchmark",
  "main_camera",
  "secondary_camera",
  "tertiary_camera",
  "front_camera",
  "refresh_rate",
}

PRICE_KEYS = ["preco", "price", "valor"]
PRICE_TYPE_SET = {"preco_intervalo", "preco", "price", "custo"}
PRICE_CRITERION_WEIGHT = 2
