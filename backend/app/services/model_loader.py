import logging
from pathlib import Path
from typing import Optional

from ultralytics import YOLO

from app.config import settings

logger = logging.getLogger(__name__)

_model_instance: Optional[YOLO] = None


def load_model(weights_path: Optional[Path] = None) -> YOLO:
    global _model_instance
    if _model_instance is not None:
        return _model_instance

    path = weights_path or settings.weights_path
    if not Path(path).exists():
        raise FileNotFoundError(f"Model weights not found at: {path}")

    _model_instance = YOLO(str(path))
    logger.info(f"YOLO model loaded from: {path}")
    logger.info(f"Model classes: {_model_instance.names}")
    return _model_instance


def get_model() -> YOLO:
    if _model_instance is None:
        return load_model()
    return _model_instance


def get_class_names() -> list[str]:
    model = get_model()
    names = model.names
    if isinstance(names, dict):
        return [str(names[i]) for i in sorted(names)]
    if isinstance(names, (list, tuple)):
        return [str(x) for x in names]
    return []


def reset_model() -> None:
    global _model_instance
    _model_instance = None
