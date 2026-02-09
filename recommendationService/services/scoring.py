"""Serviço responsável pelo cálculo final de matching (score_devices)."""

from typing import Dict, List

from ..schemas import Criterion, DeviceInput
from ..core.constants import CRITERION_ASPECT_HINT, PRICE_TYPE_SET
from ..core.device_features import (
  battery_level_from_numeric,
  build_caracteristica_map,
  build_device_vector,
  camera_level_from_numeric,
  performance_level_from_benchmark,
  performance_level_from_processor,
  performance_level_from_ram,
  performance_level_from_rom,
)
from ..core.preferences import (
  build_justificativas,
  compute_opinion_similarity,
  map_criteria_to_preferences,
)
from ..core.specs import (
  build_normalized_criteria,
  price_level_from_range,
  price_level_from_value,
  score_specifications,
)
from ..core.ml_model import build_feature_payload, predict_match_score
from ..utils.text import level_from_keywords


def score_devices(
  criterios: List[Criterion],
  dispositivos: List[DeviceInput],
) -> List[Dict[str, object]]:
  """Pontua os dispositivos candidatos de acordo com critérios e preferências."""
  if not criterios or not dispositivos:
    return []

  criterios_normalizados = build_normalized_criteria(criterios)
  structured_criteria = [c for c in criterios_normalizados if c.tipo != "texto_livre"]
  has_structured = len(structured_criteria) > 0

  prefs, weights = map_criteria_to_preferences(
    structured_criteria,
    level_from_keywords,
    price_level_from_range,
    price_level_from_value,
    performance_level_from_benchmark,
    performance_level_from_ram,
    performance_level_from_rom,
    performance_level_from_processor,
    battery_level_from_numeric,
    camera_level_from_numeric,
  )
  has_preference_targets = len(prefs) > 0
  includes_price = any(c.tipo in PRICE_TYPE_SET for c in structured_criteria)

  spec_weight = 0.0
  reviews_weight = 1.0
  if has_structured and has_preference_targets:
    if includes_price:
      spec_weight = 0.7
      reviews_weight = 0.3
    else:
      spec_weight = 0.6
      reviews_weight = 0.4
  elif has_structured:
    spec_weight = 1.0
    reviews_weight = 0.0

  total_weight = spec_weight + reviews_weight or 1.0
  normalized_weights = {
    "specs": round(spec_weight / total_weight, 2),
    "reviews": round(reviews_weight / total_weight, 2),
  }

  resultados: List[Dict[str, object]] = []
  for dispositivo in dispositivos:
    caracteristicas_map = build_caracteristica_map(dispositivo)
    spec_fit, per_criterion = score_specifications(structured_criteria, caracteristicas_map)
    device_vector = build_device_vector(dispositivo, caracteristicas_map)
    opinion_sim = compute_opinion_similarity(device_vector, prefs, weights)
    effective_spec_fit = spec_fit if has_structured else 0.5
    heuristic_score = (
      (effective_spec_fit * spec_weight) + (opinion_sim * reviews_weight)
    ) / total_weight
    feature_payload = build_feature_payload(
      spec_fit=effective_spec_fit,
      opinion_sim=opinion_sim,
      device_vector=device_vector,
      has_structured=has_structured,
      has_preference_targets=has_preference_targets,
      includes_price=includes_price,
      spec_weight=spec_weight,
      reviews_weight=reviews_weight,
    )
    final_score = predict_match_score(feature_payload, heuristic_score)
    justificativas = build_justificativas(per_criterion, device_vector, weights)
    resultados.append(
      {
        "id": dispositivo.id,
        "finalScore": round(final_score, 4),
        "matchScore": int(round(final_score * 100)),
        "perfilMatchPercent": int(round(opinion_sim * 100)),
        "criteriosMatchPercent": int(round(effective_spec_fit * 100)) if has_structured else None,
        "specFit": round(effective_spec_fit, 4),
        "opinionSim": round(opinion_sim, 4),
        "justificativas": justificativas,
        "matchExplanation": {
          "specFit": round(effective_spec_fit, 4),
          "opinionSim": round(opinion_sim, 4),
          "weights": normalized_weights.copy(),
          "perCriterion": [
            {"tipo": criterio.tipo, "score": round(criterio.score, 4)}
            for criterio in per_criterion
          ],
        },
      }
    )

  resultados.sort(key=lambda item: item["finalScore"], reverse=True)
  return resultados
