import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
JWT_ALGORITHM: str = "HS256"
JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))  # 8h
ADMIN_USER: str = os.getenv("ADMIN_USER", "admin")
ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "")
DATABASE_DIR: str = os.getenv("DATABASE_DIR", "data")
CORS_ORIGINS: list[str] = os.getenv("CORS_ORIGINS", "*").split(",")
