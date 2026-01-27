from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    app_name: str = "SSH Client API"
    debug: bool = False
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:3010"]

    class Config:
        env_file = ".env"


settings = Settings()