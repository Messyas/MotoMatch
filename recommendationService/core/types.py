"""Tipos de domínio compartilhados entre os módulos do motor de matching."""

from dataclasses import dataclass
from typing import Optional

PreferenceAspect = str
PreferenceLevel = str


@dataclass
class NormalizedCriterion:
  tipo: str
  descricao: str
  valor: Optional[float]


@dataclass
class CriterionScoreData:
  tipo: str
  score: float


@dataclass
class DeviceVector:
  device_id: str
  camera: float = 0.5
  bateria: float = 0.5
  preco: float = 0.5
  desempenho: float = 0.5
