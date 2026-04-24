import uuid
from pathlib import Path
from typing import Optional

from app.config import settings


def generate_task_id() -> str:
    return str(uuid.uuid4())


def classify_severity(bbox_area: float, image_area: float) -> str:
    ratio = bbox_area / image_area if image_area > 0 else 0
    if ratio > 0.15:
        return "high"
    elif ratio > 0.05:
        return "medium"
    return "low"


def format_detection_data(counter: dict, total: int) -> dict:
    if total == 0:
        return {}
    return {k: v for k, v in counter.items()}


def normalize_class_names(names) -> list[str]:
    if isinstance(names, dict):
        return [str(names[i]) for i in sorted(names)]
    if isinstance(names, (list, tuple)):
        return [str(x) for x in names]
    return []


def ensure_file_in_results(filename: str) -> Path:
    path = settings.results_dir / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def ensure_file_in_uploads(filename: str) -> Path:
    path = settings.uploads_dir / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def get_static_url(path: str) -> str:
    return f"/static/{path}"
