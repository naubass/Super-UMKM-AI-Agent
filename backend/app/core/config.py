from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "mysql+pymysql://user_local:password_local@db:3306/umkm_db_local"
    PROJECT_NAME: str = "SUPER UMKM AI AGENT"
    VERSION: str = "1.0.0"
    GROQ_API_KEY: str
    POLLINATIONS_API_KEY: str = ""
    REPLICATE_API_TOKEN: str = ""

    SECRET_KEY: str = "rahasia1234_jangan_kasih_tau_siapa_siapa"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    HUGGINGFACE_API_TOKEN: str = ""

    class Config:
        env_file = ".env"

settings = Settings()