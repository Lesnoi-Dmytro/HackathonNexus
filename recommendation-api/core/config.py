from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    port: int = 8000

    # Redis cache
    redis_url: str = "redis://localhost:6379"
    cache_ttl_seconds: int = 600  # 10 minutes

    # Simulate slow inference on low-end hardware (0 = disabled)
    model_sim_delay_ms: int = 0


settings = Settings()
