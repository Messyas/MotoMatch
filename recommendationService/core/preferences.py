"""Lógica relacionada a preferências declaradas e justificativas de recomendação."""

from typing import Dict, List, Optional, Tuple

from ..utils.numeric import clamp_score
from .constants import (
  ASPECT_JUSTIFICATION_LABELS,
  CRITERION_ASPECT_HINT,
  CRITERION_FALLBACK_JUSTIFICATION,
  LEVEL_TO_SCORE,
  TARGET,
)
from .types import CriterionScoreData, DeviceVector, PreferenceAspect, PreferenceLevel


def level_to_score(level: PreferenceLevel) -> float:
  """Converte um nível textual em score normalizado (0-1)."""
  return LEVEL_TO_SCORE.get(level, 0.5)


def merge_preference(
  prefs: Dict[PreferenceAspect, PreferenceLevel],
  weights: Dict[PreferenceAspect, float],
  aspect: PreferenceAspect,
  incoming: Optional[PreferenceLevel],
) -> None:
  """Mantém o nível dominante por aspecto e ajusta pesos mínimos."""
  if incoming is None:
    return
  current = prefs.get(aspect)
  if current is None or level_to_score(incoming) > level_to_score(current):
    prefs[aspect] = incoming
  current_weight = weights.get(aspect, 1)
  minimum_weight = 3 if aspect == "preco" else 2
  weights[aspect] = max(current_weight, minimum_weight)


def map_criteria_to_preferences(
  criterios,
  level_from_keywords,
  price_level_from_range,
  price_level_from_value,
  performance_level_from_benchmark,
  performance_level_from_ram,
  performance_level_from_rom,
  performance_level_from_processor,
  battery_level_from_numeric,
  camera_level_from_numeric,
) -> Tuple[Dict[PreferenceAspect, PreferenceLevel], Dict[PreferenceAspect, float]]:
  """Traduz critérios estruturados em preferências alvo e pesos respectivos."""
  prefs: Dict[PreferenceAspect, PreferenceLevel] = {}
  weights: Dict[PreferenceAspect, float] = {}
  for criterio in criterios:
    tipo = criterio.tipo
    descricao = criterio.descricao
    valor = criterio.valor
    if tipo == "texto_livre":
      continue
    if tipo == "battery":
      level = level_from_keywords(descricao) if valor is None else battery_level_from_numeric(valor)
      merge_preference(prefs, weights, "bateria", level)
      continue
    if tipo in {"main_camera", "secondary_camera", "tertiary_camera", "front_camera", "camera"}:
      level = level_from_keywords(descricao) if valor is None else camera_level_from_numeric(valor)
      merge_preference(prefs, weights, "camera", level)
      continue
    if tipo == "benchmark":
      level = level_from_keywords(descricao) if valor is None else performance_level_from_benchmark(valor)
      merge_preference(prefs, weights, "desempenho", level)
      continue
    if tipo == "preco_intervalo":
      level = price_level_from_range(descricao)
      merge_preference(prefs, weights, "preco", level)
      continue
    if tipo == "ram":
      level = level_from_keywords(descricao) if valor is None else performance_level_from_ram(valor)
      merge_preference(prefs, weights, "desempenho", level)
      continue
    if tipo == "rom":
      level = level_from_keywords(descricao) if valor is None else performance_level_from_rom(valor)
      merge_preference(prefs, weights, "desempenho", level)
      continue
    if tipo == "processor":
      level = performance_level_from_processor(descricao) or level_from_keywords(descricao)
      merge_preference(prefs, weights, "desempenho", level)
      continue
    if tipo in {"preco", "price", "custo"}:
      level = price_level_from_value(valor) if valor is not None else level_from_keywords(descricao)
      merge_preference(prefs, weights, "preco", level)
  return prefs, weights


def prefs_to_target(prefs: Dict[PreferenceAspect, PreferenceLevel]) -> Dict[PreferenceAspect, float]:
  """Converte preferências declaradas no vetor alvo usado na similaridade."""
  return {
    "camera": TARGET.get(prefs.get("camera", "ok"), 0.5),
    "bateria": TARGET.get(prefs.get("bateria", "ok"), 0.5),
    "preco": TARGET.get(prefs.get("preco", "ok"), 0.5),
    "desempenho": TARGET.get(prefs.get("desempenho", "ok"), 0.5),
  }


def compute_opinion_similarity(
  vector: DeviceVector,
  prefs: Dict[PreferenceAspect, PreferenceLevel],
  weights: Dict[PreferenceAspect, float],
) -> float:
  """Calcula a similaridade entre o vetor agregado e o alvo do usuário."""
  target = prefs_to_target(prefs)
  w = {
    "camera": weights.get("camera", 1.0),
    "bateria": weights.get("bateria", 1.0),
    "preco": weights.get("preco", 1.0),
    "desempenho": weights.get("desempenho", 1.0),
  }
  denom = sum(w.values()) or 1.0
  dist = (
    w["camera"] * abs(vector.camera - target["camera"]) +
    w["bateria"] * abs(vector.bateria - target["bateria"]) +
    w["preco"] * abs(vector.preco - target["preco"]) +
    w["desempenho"] * abs(vector.desempenho - target["desempenho"])
  )
  return max(0.0, 1 - min(1.0, dist / denom))


def describe_aspect_justification(aspect: PreferenceAspect, value: Optional[float]) -> Optional[str]:
  """Gera uma justificativa textual para um aspecto específico."""
  labels = ASPECT_JUSTIFICATION_LABELS.get(aspect)
  if not labels:
    return None
  numeric = value if value is not None else 0.5
  if numeric >= 0.8:
    return labels["strong"]
  if numeric >= 0.65:
    return labels["good"]
  return None


def build_justificativas(
  per_criterion: List[CriterionScoreData],
  device_vector: DeviceVector,
  weights: Dict[PreferenceAspect, float],
) -> List[str]:
  """Constrói até três mensagens de justificativa para o resultado final."""
  added: List[str] = []

  def add(text: Optional[str]) -> None:
    if text and text not in added:
      added.append(text)

  focus_aspects = [aspect for aspect, weight in weights.items() if weight > 1.5]
  for aspect in focus_aspects:
    add(describe_aspect_justification(aspect, getattr(device_vector, aspect, 0.5)))

  sorted_criteria = sorted(
    (
      criterio
      for criterio in per_criterion
      if criterio.tipo != "texto_livre" and criterio.score >= 0.7
    ),
    key=lambda c: c.score,
    reverse=True,
  )

  for criterio in sorted_criteria:
    if criterio.tipo == "preco_intervalo":
      add(
        "Dentro do orçamento que você informou"
        if criterio.score >= 0.9
        else "Mantém o orçamento definido"
      )
      continue
    aspect = CRITERION_ASPECT_HINT.get(criterio.tipo)
    if aspect:
      add(describe_aspect_justification(aspect, getattr(device_vector, aspect, 0.5)))
      continue
    fallback = CRITERION_FALLBACK_JUSTIFICATION.get(criterio.tipo)
    if fallback:
      add(fallback)

  if len(added) < 2:
    sorted_aspects = sorted(
      ["camera", "bateria", "desempenho", "preco"],
      key=lambda aspect: getattr(device_vector, aspect, 0.5),
      reverse=True,
    )
    for aspect in sorted_aspects:
      add(describe_aspect_justification(aspect, getattr(device_vector, aspect, 0.5)))
      if len(added) >= 3:
        break

  if not added:
    add("Combinação equilibrada com o que você pediu")

  return added[:3]
