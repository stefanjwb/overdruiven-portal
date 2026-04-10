from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    password: Optional[str] = None


class InviteCodeCreate(BaseModel):
    role: str = "user"


class InviteCodeResponse(BaseModel):
    id: int
    code: str
    role: str
    created_at: str  # ISO string


class ContactRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    message: Optional[str] = Field(default=None, max_length=2000)
