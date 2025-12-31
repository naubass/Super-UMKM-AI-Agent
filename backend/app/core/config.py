from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SUPER UMKM AI AGENT"
    VERSION: str = "1.0.0"
    GROQ_API_KEY: str
    POLLINATIONS_API_KEY: str = ""

    class Config:
        env_file = ".env"

settings = Settings()