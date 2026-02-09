"""Integração do modelo de ML usado no cálculo de matching."""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional

try:
  import joblib
except ImportError:  # pragma: no cover - handled em runtime
  joblib = None

try:
  import pandas as pd
except ImportError:  # pragma: no cover - handled em runtime
  pd = None

from ..utils.numeric import clamp_score
from .types import DeviceVector

logger = logging.getLogger(__name__)

MATCH_FEATURE_COLUMNS = [
  "spec_fit",
  "opinion_sim",
  "camera",
  "bateria",
  "preco",
  "desempenho",
  "has_structured",
  "has_preference_targets",
  "includes_price",
  "spec_weight",
  "reviews_weight",
]

MATCHING_MODEL_ENV = "MATCHING_MODEL_PATH"
DEFAULT_MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "device_matching_model.joblib"


@dataclass
class MatchModelArtifact:
  """Wrapper serializável contendo o estimador treinado."""

  feature_names: List[str]
  estimator: object

  def predict(self, payload: Dict[str, float]) -> float:
    """Executa o `predict` sempre que possível preservando os nomes das colunas."""
    frame = _payload_to_dataframe(payload, self.feature_names)
    if frame is not None:
      prediction = self.estimator.predict(frame)
      return float(prediction[0])
    vector = _payload_to_vector(payload, self.feature_names)
    prediction = self.estimator.predict([vector])
    return float(prediction[0])


_MODEL_CACHE: Optional[MatchModelArtifact] = None
_MODEL_CACHE_PATH: Optional[Path] = None


def _resolve_model_path(path: Optional[str]) -> Path:
  """Obtém o caminho final considerando argumento e variável de ambiente."""
  if path:
    return Path(path).expanduser()
  env_path = os.getenv(MATCHING_MODEL_ENV)
  if env_path:
    return Path(env_path).expanduser()
  return DEFAULT_MODEL_PATH


def load_match_model(path: Optional[str] = None) -> Optional[MatchModelArtifact]:
  """Carrega o artefato treinado do disco, com cache em memória."""
  if joblib is None:
    logger.warning("joblib não encontrado - fallback para cálculo heurístico.")
    return None
  resolved = _resolve_model_path(path)
  if not resolved.exists():
    logger.info("Modelo de matching não encontrado em %s. Usando fallback.", resolved)
    return None
  global _MODEL_CACHE, _MODEL_CACHE_PATH
  if _MODEL_CACHE is not None and _MODEL_CACHE_PATH == resolved:
    return _MODEL_CACHE
  try:
    artifact = joblib.load(resolved)
  except Exception as exc:  # pragma: no cover - proteção runtime
    logger.error("Falha ao carregar modelo de matching: %s", exc)
    return None
  if isinstance(artifact, MatchModelArtifact):
    model = artifact
  else:
    model = MatchModelArtifact(feature_names=MATCH_FEATURE_COLUMNS.copy(), estimator=artifact)
  _MODEL_CACHE = model
  _MODEL_CACHE_PATH = resolved
  return model


def build_feature_payload(
  spec_fit: float,
  opinion_sim: float,
  device_vector: DeviceVector,
  has_structured: bool,
  has_preference_targets: bool,
  includes_price: bool,
  spec_weight: float,
  reviews_weight: float,
) -> Dict[str, float]:
  """Monta o dicionário de features esperadas pelo modelo."""
  return {
    "spec_fit": float(spec_fit),
    "opinion_sim": float(opinion_sim),
    "camera": float(device_vector.camera),
    "bateria": float(device_vector.bateria),
    "preco": float(device_vector.preco),
    "desempenho": float(device_vector.desempenho),
    "has_structured": 1.0 if has_structured else 0.0,
    "has_preference_targets": 1.0 if has_preference_targets else 0.0,
    "includes_price": 1.0 if includes_price else 0.0,
    "spec_weight": float(spec_weight),
    "reviews_weight": float(reviews_weight),
  }


def _payload_to_vector(payload: Dict[str, float], columns: List[str]) -> List[float]:
  """Converte o payload de features em vetor ordenado."""
  return [float(payload.get(column, 0.0)) for column in columns]


def _payload_to_dataframe(payload: Dict[str, float], columns: List[str]):
  """Cria um DataFrame com nomes de colunas compatíveis quando pandas estiver disponível."""
  if pd is None:
    return None
  data = [{column: float(payload.get(column, 0.0)) for column in columns}]
  return pd.DataFrame(data, columns=columns)


def predict_match_score(feature_payload: Dict[str, float], fallback: float) -> float:
  """Aplica o modelo treinado (quando existir) ou usa o score heurístico."""
  model = load_match_model()
  if model is None:
    return clamp_score(fallback)
  try:
    prediction = model.predict(feature_payload)
  except Exception as exc:  # pragma: no cover - proteção runtime
    logger.error("Erro ao executar o modelo treinado: %s", exc)
    return clamp_score(fallback)
  return clamp_score(prediction)


__all__ = [
  "MATCH_FEATURE_COLUMNS",
  "DEFAULT_MODEL_PATH",
  "MatchModelArtifact",
  "build_feature_payload",
  "load_match_model",
  "predict_match_score",
]
