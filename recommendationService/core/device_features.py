"""Funções auxiliares para extrair vetores e níveis de especificações."""

from typing import Dict, Optional

from ..schemas import DeviceInput
from ..utils.numeric import clamp_score, parse_value
from ..utils.text import normalize_text
from .preferences import level_to_score
from .specs import get_device_price_from_map, price_level_from_value
from .types import DeviceVector


def build_caracteristica_map(device: DeviceInput) -> Dict[str, str]:
  """Transforma a lista de características em um dicionário chave-valor."""
  entries: Dict[str, str] = {}
  for caracteristica in device.caracteristicas:
    tipo = caracteristica.tipo.strip().lower()
    if not tipo:
      continue
    entries[tipo] = str(caracteristica.descricao)
  if device.preco is not None:
    entries["preco"] = str(device.preco)
  return entries


def camera_level_from_numeric(value: float) -> str:
  """Mapeia megapixels para níveis qualitativos de câmera."""
  if value >= 64:
    return "top"
  if value >= 48:
    return "boa"
  if value >= 20:
    return "ok"
  return "basica"


def battery_level_from_numeric(value: float) -> str:
  """Classifica a capacidade de bateria em faixas qualitativas."""
  if value >= 6000:
    return "top"
  if value >= 5000:
    return "boa"
  if value >= 4500:
    return "ok"
  return "basica"


def performance_level_from_ram(value: float) -> str:
  """Infere o nível de desempenho com base em RAM disponível."""
  if value >= 12:
    return "top"
  if value >= 8:
    return "boa"
  if value >= 6:
    return "ok"
  return "basica"


def performance_level_from_rom(value: float) -> str:
  """Infere o nível de desempenho considerando armazenamento interno."""
  if value >= 512:
    return "top"
  if value >= 256:
    return "boa"
  if value >= 128:
    return "ok"
  return "basica"


def performance_level_from_benchmark(value: float) -> str:
  """Converte pontuações de benchmark em níveis qualitativos."""
  if value >= 1_200_000:
    return "top"
  if value >= 900_000:
    return "boa"
  if value >= 600_000:
    return "ok"
  return "basica"


def performance_level_from_processor(text: str) -> Optional[str]:
  """Classifica o processador citado (texto) quando houver correspondência conhecida."""
  normalized = normalize_text(text)
  if not normalized:
    return None
  if any(keyword in normalized for keyword in ["snapdragon 8", "dimensity 9", "apple a16", "apple a17", "tensor g3", "exynos 2400"]):
    return "top"
  if any(keyword in normalized for keyword in ["snapdragon 7", "dimensity 8", "apple a14", "apple a15", "tensor g2", "exynos 2200"]):
    return "boa"
  if any(keyword in normalized for keyword in ["snapdragon 6", "snapdragon 4", "dimensity 7", "helio g8", "tensor g1"]):
    return "ok"
  return None


def camera_score_from_spec(map_data: Dict[str, str]) -> Optional[float]:
  """Converte especificações de câmera em score normalizado."""
  keys = ["main_camera", "camera", "primary_camera", "rear_camera", "secondary_camera"]
  best: Optional[float] = None
  for key in keys:
    value = map_data.get(key)
    parsed = parse_value(value) if value is not None else None
    if parsed is not None:
      best = max(best, parsed) if best is not None else parsed
  if best is None:
    return None
  return level_to_score(camera_level_from_numeric(best))


def battery_score_from_spec(map_data: Dict[str, str]) -> Optional[float]:
  """Converte especificações de bateria em score normalizado."""
  value = map_data.get("battery")
  parsed = parse_value(value) if value is not None else None
  if parsed is None:
    return None
  return level_to_score(battery_level_from_numeric(parsed))


def desempenho_score_from_spec(map_data: Dict[str, str]) -> Optional[float]:
  """Combina várias specs para derivar o score de desempenho do vetor."""
  benchmark_value = parse_value(map_data.get("benchmark")) if map_data.get("benchmark") else None
  if benchmark_value is not None:
    return level_to_score(performance_level_from_benchmark(benchmark_value))
  ram_value = parse_value(map_data.get("ram")) if map_data.get("ram") else None
  if ram_value is not None:
    return level_to_score(performance_level_from_ram(ram_value))
  rom_value = parse_value(map_data.get("rom")) if map_data.get("rom") else None
  if rom_value is not None:
    return level_to_score(performance_level_from_rom(rom_value))
  processor = map_data.get("processor")
  if processor:
    processor_level = performance_level_from_processor(processor)
    if processor_level:
      return level_to_score(processor_level)
  return None


def build_device_vector(device: DeviceInput, caracteristicas_map: Dict[str, str]) -> DeviceVector:
  """Monta o vetor de aspectos usado no cálculo de similaridade de opinião."""
  vector = DeviceVector(device_id=device.id)
  aspect_scores = device.aspect_scores.model_dump() if device.aspect_scores else {}
  allowed_aspects = {"camera", "bateria", "preco", "desempenho"}
  for aspect, value in aspect_scores.items():
    if aspect not in allowed_aspects:
      continue
    if value is None:
      continue
    setattr(vector, aspect, clamp_score(value, getattr(vector, aspect)))
  if aspect_scores.get("preco") is None:
    price = get_device_price_from_map(caracteristicas_map)
    if price is not None:
      vector.preco = level_to_score(price_level_from_value(price))
  if aspect_scores.get("camera") is None:
    camera_score = camera_score_from_spec(caracteristicas_map)
    if camera_score is not None:
      vector.camera = camera_score
  if aspect_scores.get("bateria") is None:
    battery_score = battery_score_from_spec(caracteristicas_map)
    if battery_score is not None:
      vector.bateria = battery_score
  if aspect_scores.get("desempenho") is None:
    desempenho_score = desempenho_score_from_spec(caracteristicas_map)
    if desempenho_score is not None:
      vector.desempenho = desempenho_score
  return vector
