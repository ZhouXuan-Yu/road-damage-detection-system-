from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Road Damage Detection System"
    app_version: str = "0.1.0"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000

    base_dir: Path = Path(__file__).parent.parent.resolve()
    weights_path: Path = Path(__file__).parent.parent.parent.parent.parent / "yolo11n_rdd2022" / "weights" / "best.pt"
    uploads_dir: Path = Path(__file__).parent.parent.resolve() / "uploads"
    results_dir: Path = Path(__file__).parent.parent.resolve() / "results"
    reports_dir: Path = Path(__file__).parent.parent.resolve() / "reports"

    database_url: str = "sqlite+aiosqlite:///C:\\Users\\ZhouXuan\\Desktop\\Xu\\BiShe\\Project\\backend\\detections.db"

    default_confidence: float = 0.25
    default_iou: float = 0.45
    video_frame_skip: int = 5

    openai_api_key: str = ""
    openai_base_url: str = "https://api.deepseek.com"
    llm_model: str = "deepseek-chat"
    llm_api_key: str = ""

    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = ""

    def ensure_dirs(self) -> None:
        for d in [self.uploads_dir, self.results_dir, self.reports_dir]:
            d.mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.ensure_dirs()
