from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Chromatic Alchemist"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # Database
    # Railway provides postgresql://, property converts to postgresql+asyncpg://
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/chromatic_alchemist"

    @property
    def DATABASE_URL_ASYNC(self) -> str:
        """Convert to async driver URL for SQLAlchemy async engine"""
        url = self.DATABASE_URL
        if url.startswith("postgresql://") and "+asyncpg" not in url:
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # CORS - comma-separated string, parsed to list
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def CORS_ORIGINS_LIST(self) -> list[str]:
        """Parse comma-separated CORS origins to list"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Allow extra env vars from Railway


settings = Settings()
