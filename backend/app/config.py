from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    api_name: str = "Backend Service"
    api_version: str = "1.0.0"
    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:3000", "chrome-extension://*"]
    code_length: int = 4
    code_alphabet: str = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ!@#$%&*?"
    max_generate: int = 100
    ytm_client_token: str = "dev-token"

    model_config = SettingsConfigDict(env_prefix="APP_", case_sensitive=False)

settings = Settings()
