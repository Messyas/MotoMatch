import unittest

from recommendationService import matching
from recommendationService.core.specs import score_specifications
from recommendationService.core.types import NormalizedCriterion
from recommendationService.schemas import (
  AspectScores,
  Criterion,
  DeviceCharacteristic,
  DeviceInput,
)


class MatchingTests(unittest.TestCase):
  def test_score_specifications_prefers_numeric_matches(self):
    criterios = [
      NormalizedCriterion(tipo="ram", descricao="8", valor=8),
      NormalizedCriterion(tipo="battery", descricao="5000", valor=5000),
    ]
    caracteristicas_map = {"ram": "8", "battery": "5100"}

    spec_fit, per_criterion = score_specifications(criterios, caracteristicas_map)

    self.assertGreaterEqual(spec_fit, 0.95)
    self.assertTrue(all(entry.score >= 0.9 for entry in per_criterion))

  def test_score_devices_orders_by_final_score(self):
    criterios = [
      Criterion(tipo="ram", descricao="8"),
      Criterion(tipo="preco_intervalo", descricao="1200-2000"),
    ]
    dispositivos = [
      DeviceInput(
        id="premium",
        preco=1600,
        caracteristicas=[
          DeviceCharacteristic(tipo="ram", descricao="8"),
          DeviceCharacteristic(tipo="battery", descricao="5000"),
        ],
        aspect_scores=AspectScores(camera=0.85, bateria=0.8),
      ),
      DeviceInput(
        id="entrada",
        preco=1100,
        caracteristicas=[
          DeviceCharacteristic(tipo="ram", descricao="4"),
          DeviceCharacteristic(tipo="battery", descricao="4000"),
        ],
        aspect_scores=AspectScores(camera=0.6, bateria=0.6),
      ),
    ]

    resultados = matching.score_devices(criterios, dispositivos)

    self.assertEqual(resultados[0]["id"], "premium")
    self.assertGreater(resultados[0]["matchScore"], resultados[1]["matchScore"])
    self.assertIn("matchExplanation", resultados[0])
    self.assertTrue(resultados[0]["justificativas"])


if __name__ == "__main__":
  unittest.main()
