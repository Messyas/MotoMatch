"""Utilitários para normalização de texto e inferência semântica."""

import re
import unicodedata
from typing import Optional


def normalize_text(value: Optional[str]) -> str:
  """Remove acentos e padroniza strings para comparação case-insensitive."""
  if value is None:
    return ""
  normalized = unicodedata.normalize("NFD", str(value))
  normalized = re.sub(r"[\u0300-\u036f]", "", normalized)
  return normalized.lower().strip()


def level_from_keywords(text: str) -> Optional[str]:
  """Classifica termos como básico/intermediário/topo com base em palavras-chave."""
  normalized = normalize_text(text)
  if not normalized:
    return None
  if re.search(r"(top|excelente|perfeito|premium|flagship)", normalized):
    return "top"
  if re.search(r"(otim|boa|bom|superior|high)", normalized):
    return "boa"
  if re.search(r"(medi|intermedi|ok|regular)", normalized):
    return "ok"
  if re.search(r"(bas|simples|entrada|ruim|fraco)", normalized):
    return "basica"
  return None


def infer_level_from_text(normalized_text: str, fallback: str = "boa") -> str:
  """Heurística simples para inferir nível textual quando não há especificação numérica."""
  if re.search(r"(top|premium|excelent|incrivel|fantastic)", normalized_text):
    return "top"
  if re.search(r"(boa|otima|ótima|melhor|perfeit)", normalized_text):
    return "boa"
  if re.search(r"(ok|intermedi|mediana|regular)", normalized_text):
    return "ok"
  if re.search(r"(simples|basica|de entrada|barata)", normalized_text):
    return "basica"
  return fallback


def infer_price_range_from_text(normalized_text: str) -> Optional[str]:
  """Extrai ou deduz uma faixa de preço (min-max) a partir de texto livre."""
  numbers = [int(n) for n in re.findall(r"\d{3,5}", normalized_text)]
  if numbers:
    numbers.sort()
    if len(numbers) >= 2:
      return f"{numbers[0]}-{numbers[-1]}"
    single = numbers[0]
    if re.search(r"(ate|até|maxim|no maximo)", normalized_text):
      return f"0-{single}"
    if re.search(r"(acima|mais de|a partir)", normalized_text):
      return f"{single}-99999"
    return f"{max(0, single - 500)}-{single + 500}"
  if re.search(r"(barat|custo-beneficio|economico)", normalized_text):
    return "0-1500"
  if re.search(r"(intermedi|medio|equilibrado)", normalized_text):
    return "1500-2500"
  if re.search(r"(caro|premium|top|flagship|alto)", normalized_text):
    return "2500-99999"
  return None
