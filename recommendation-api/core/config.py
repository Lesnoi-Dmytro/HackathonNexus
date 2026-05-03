from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    port: int = 8000

    api_token: str

    redis_url: str = "redis://localhost:6379"
    cache_ttl_seconds: int = 600


settings = Settings()
