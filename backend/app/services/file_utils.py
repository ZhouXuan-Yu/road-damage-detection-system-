from pathlib import Path
from typing import Optional

from app.config import settings


def get_upload_path(filename: str) -> Path:
    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    return settings.uploads_dir / filename


def get_result_path(filename: str) -> Path:
    settings.results_dir.mkdir(parents=True, exist_ok=True)
    return settings.results_dir / filename


def get_report_path(filename: str) -> Path:
    settings.reports_dir.mkdir(parents=True, exist_ok=True)
    return settings.reports_dir / filename


def get_relative_result_path(full_path: Path) -> str:
    try:
        return str(full_path.relative_to(settings.results_dir))
    except ValueError:
        return full_path.name


def get_relative_upload_path(full_path: Path) -> str:
    try:
        return str(full_path.relative_to(settings.uploads_dir))
    except ValueError:
        return full_path.name


def allowed_image(filename: str) -> bool:
    ext = Path(filename).suffix.lower()
    return ext in {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def allowed_video(filename: str) -> bool:
    ext = Path(filename).suffix.lower()
    return ext in {".mp4", ".avi", ".mov", ".mkv"}


def get_file_extension(filename: str) -> str:
    return Path(filename).suffix.lower()
