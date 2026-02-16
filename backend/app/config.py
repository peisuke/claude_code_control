from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    app_name: str = "SSH Client API"
    debug: bool = False
    # Default: localhost only. Override via .env: CORS_ORIGINS='["http://192.168.1.100:8080"]'
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:3010"]

    class Config:
        env_file = ".env"


settings = Settings()