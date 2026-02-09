"""Funções utilitárias para parsing numérico e cálculos de pontuação."""

import re
from typing import Optional


def parse_value(descricao: str) -> Optional[float]:
  """Converte uma string numérico (com pontos e vírgulas) em float seguro."""
  if descricao is None:
    return None
  text = str(descricao).strip()
  if not text:
    return None
  text = re.sub(r"\.(?=\d{3}\b)", "", text)
  text = re.sub(r"[^0-9,.-]", "", text)
  text = text.replace(",", ".")
  try:
    return float(text)
  except ValueError:
    return None


def clamp_score(value: Optional[float], fallback: float = 0.5) -> float:
  """Garante que um score fique no intervalo [0,1], usando fallback quando necessário."""
  if value is None or isinstance(value, float) and (value != value):
    return fallback
  return max(0.0, min(1.0, float(value)))


def compute_price_score(
  device_price: Optional[float],
  min_value: Optional[float],
  max_value: Optional[float],
) -> float:
  """Calcula o quão dentro da faixa de preço requisitada um dispositivo está."""
  if device_price is None:
    return 0.0
  score = 1.0
  if min_value is not None and device_price < min_value:
    diff = min_value - device_price
    tolerance = max(min_value * 0.2, 150)
    score = 1 - diff / tolerance
  if max_value is not None and device_price > max_value:
    diff = device_price - max_value
    tolerance = max(max_value * 0.2, 150)
    score = min(score, 1 - diff / tolerance)
  return max(0.0, min(1.0, score))
