from typing import Optional
from sqlmodel import SQLModel, Field


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True, max_length=80)
    email: str = Field(unique=True, max_length=120)
    password_hash: Optional[str] = Field(default=None, max_length=255)
    role: str = Field(default="user", max_length=20)  # user | organizer | admin
    oauth_provider: Optional[str] = Field(default=None, max_length=30)
    oauth_id: Optional[str] = Field(default=None, max_length=255)
    first_name: Optional[str] = Field(default=None, max_length=100)
    last_name: Optional[str] = Field(default=None, max_length=100)
    avatar: Optional[str] = None  # base64 data URL
