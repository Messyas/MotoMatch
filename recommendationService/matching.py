"""Interface pública do motor de matching, reexportando score_devices."""

from .services.scoring import score_devices

__all__ = ["score_devices"]
