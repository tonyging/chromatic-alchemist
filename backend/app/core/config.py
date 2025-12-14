import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Chromatic Alchemist"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # Database - Railway provides postgresql://, we need postgresql+asyncpg://
    DATABASE_URL_RAW: str = "postgresql+asyncpg://postgres:password@localhost:5432/chromatic_alchemist"

    @property
    def DATABASE_URL(self) -> str:
        url = self.DATABASE_URL_RAW
        # Convert postgresql:// to postgresql+asyncpg:// for async support
        if url.startswith("postgresql://") and "+asyncpg" not in url:
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # CORS - support comma-separated list from env
    CORS_ORIGINS_STR: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def CORS_ORIGINS(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS_STR.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Allow extra env vars from Railway


settings = Settings()
