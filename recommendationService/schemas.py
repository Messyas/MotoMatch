from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class Criterion(BaseModel):
  tipo: str
  descricao: str


class DeviceCharacteristic(BaseModel):
  tipo: str
  descricao: str


class AspectScores(BaseModel):
  camera: Optional[float] = None
  bateria: Optional[float] = None
  preco: Optional[float] = None
  desempenho: Optional[float] = None


class DeviceInput(BaseModel):
  id: str
  caracteristicas: List[DeviceCharacteristic] = Field(default_factory=list)
  preco: Optional[float] = None
  aspect_scores: Optional[AspectScores] = None


class ScoreRequest(BaseModel):
  criterios: List[Criterion] = Field(default_factory=list)
  dispositivos: List[DeviceInput] = Field(default_factory=list)


class CriterionScore(BaseModel):
  tipo: str
  score: float


class MatchExplanation(BaseModel):
  specFit: float
  opinionSim: float
  weights: Dict[str, float]
  perCriterion: List[CriterionScore]


class DeviceScoreResponse(BaseModel):
  id: str
  finalScore: float
  matchScore: int
  perfilMatchPercent: int
  criteriosMatchPercent: Optional[int] = None
  specFit: float
  opinionSim: float
  justificativas: List[str]
  matchExplanation: MatchExplanation


class ScoreResponse(BaseModel):
  scores: List[DeviceScoreResponse]
