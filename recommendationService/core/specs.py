"""Funções relacionadas a critérios estruturados e pontuação de especificações."""

from typing import Dict, List, Optional, Tuple

from ..schemas import Criterion
from ..utils.numeric import compute_price_score, parse_value
from ..utils.text import normalize_text
from .constants import NUMERIC_CRITERIA_TYPES, PRICE_KEYS, PRICE_CRITERION_WEIGHT
from .types import CriterionScoreData, NormalizedCriterion


def parse_price_range(range_text: str) -> Tuple[Optional[float], Optional[float]]:
  """Separa intervalos no formato 'min-max' em valores numéricos seguros."""
  if not range_text:
    return None, None
  cleaned = range_text.replace(" ", "")
  parts = cleaned.split("-")
  raw_min = parts[0] if parts else ""
  raw_max = parts[1] if len(parts) > 1 else ""
  min_value = parse_value(raw_min) if raw_min else None
  max_value = parse_value(raw_max) if raw_max else None
  return min_value, max_value


def price_level_from_range(range_text: str) -> Optional[str]:
  """Infere o nível (básico/ok/boa/top) a partir de uma faixa de preço."""
  min_value, max_value = parse_price_range(range_text)
  has_min = isinstance(min_value, (int, float))
  has_max = isinstance(max_value, (int, float))
  if not has_min and not has_max:
    return None
  if has_min and has_max:
    target = (min_value + max_value) / 2  # type: ignore
  elif has_min:
    target = min_value  # type: ignore
  else:
    target = max_value  # type: ignore
  return price_level_from_value(target) if target is not None else None


def price_level_from_value(value: float) -> str:
  """Mapeia um preço isolado para o nível de custo equivalente."""
  if value <= 1000:
    return "basica"
  if value <= 2000:
    return "ok"
  if value <= 3000:
    return "boa"
  return "top"


def get_device_price_from_map(caracteristicas_map: Dict[str, str]) -> Optional[float]:
  """Procura o preço de um dispositivo no dicionário de características."""
  for key in PRICE_KEYS:
    raw = caracteristicas_map.get(key)
    if raw is None:
      continue
    value = parse_value(raw)
    if value is not None:
      return value
  return None


def build_normalized_criteria(criterios: List[Criterion]) -> List[NormalizedCriterion]:
  """Normaliza o texto dos critérios e já tenta extrair valores numéricos."""
  normalized: List[NormalizedCriterion] = []
  for criterio in criterios:
    tipo = criterio.tipo.strip().lower()
    if not tipo:
      continue
    descricao = criterio.descricao.strip().lower()
    normalized.append(
      NormalizedCriterion(
        tipo=tipo,
        descricao=descricao,
        valor=parse_value(descricao),
      )
    )
  return normalized


def score_specifications(
  criterios: List[NormalizedCriterion],
  caracteristicas_map: Dict[str, str],
) -> Tuple[float, List[CriterionScoreData]]:
  """Calcula o ajuste às especificações com base nos critérios estruturados."""
  if not criterios:
    return 0.5, []
  weighted_sum = 0.0
  total_weight = 0.0
  per_criterion: List[CriterionScoreData] = []
  for criterio in criterios:
    raw_value = caracteristicas_map.get(criterio.tipo)
    score = 0.0
    weight = PRICE_CRITERION_WEIGHT if criterio.tipo == "preco_intervalo" else 1.0
    if criterio.tipo == "preco_intervalo":
      min_value, max_value = parse_price_range(criterio.descricao)
      device_price = get_device_price_from_map(caracteristicas_map)
      score = compute_price_score(device_price, min_value, max_value)
      weighted_sum += score * weight
      total_weight += weight
      per_criterion.append(CriterionScoreData(tipo=criterio.tipo, score=round(score, 4)))
      continue
    if criterio.tipo in NUMERIC_CRITERIA_TYPES:
      desired = criterio.valor if criterio.valor is not None else parse_value(criterio.descricao)
      device_value = parse_value(raw_value) if raw_value is not None else None
      if desired is not None and device_value is not None:
        if device_value >= desired:
          score = 1.0
        else:
          ratio = device_value / max(desired, 1e-9)
          score = max(0.0, min(1.0, (ratio - 0.7) / 0.3))
    else:
      normalized_device = normalize_text(raw_value)
      normalized_desired = normalize_text(criterio.descricao)
      if normalized_desired and normalized_desired in normalized_device:
        score = 1.0
    weighted_sum += score * weight
    total_weight += weight
    per_criterion.append(CriterionScoreData(tipo=criterio.tipo, score=round(score, 4)))
  spec_fit = weighted_sum / total_weight if total_weight > 0 else 0.0
  return round(spec_fit, 4), per_criterion
