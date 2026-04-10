from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator
import re


def validate_password_strength(password: str) -> str:
    """Gedeelde wachtwoordvalidatie — gooit ValueError bij te zwak wachtwoord."""
    if len(password) < 8:
        raise ValueError("Het wachtwoord moet minimaal 8 tekens lang zijn.")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Het wachtwoord moet een hoofdletter bevatten.")
    if not re.search(r"[a-z]", password):
        raise ValueError("Het wachtwoord moet een kleine letter bevatten.")
    if not re.search(r"\d", password):
        raise ValueError("Het wachtwoord moet een cijfer bevatten.")
    if not re.search(r"[!@#$%^&*()\-_=+\[\]{};:'\",.<>?/\\|`~]", password):
        raise ValueError("Het wachtwoord moet een speciaal teken bevatten (bijv. !@#$%).")
    return password


class LoginRequest(BaseModel):
    username: str
    password: str


class CheckInviteRequest(BaseModel):
    invite_code: str


class SendCodeRequest(BaseModel):
    invite_code: str
    first_name: str
    last_name: str
    email: EmailStr


class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    avatar: Optional[str] = None  # base64 data URL

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return validate_password_strength(v)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar: Optional[str] = None
