from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30       # Kortere levensduur
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Cookies
    SECURE_COOKIES: bool = False                 # Zet op True in productie (HTTPS)
    FRONTEND_URL: str = "http://localhost:5173"

    # Database
    DATABASE_URL: str = "sqlite:///./instance/activities.db"

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Google Calendar
    GOOGLE_CALENDAR_ID: str = ""
    SERVICE_ACCOUNT_FILE: str = "credentials/service_account.json"

    # Mail
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_PORT: int = 587
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM_NAME: str = "Chateau Overdruiven"

    # Bank / Payment
    BANK_ACCOUNT_NUMBER: str = ""
    BANK_ACCOUNT_NAME: str = ""

    # Admin
    ADMIN_EMAIL: str = ""
    SERVER_NAME: str = "localhost:8000"


    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()

if settings.SECRET_KEY == "change-me-in-production":
    import warnings
    warnings.warn(
        "SECRET_KEY staat nog op de standaardwaarde! Stel een veilige SECRET_KEY in via de .env.",
        stacklevel=2,
    )
