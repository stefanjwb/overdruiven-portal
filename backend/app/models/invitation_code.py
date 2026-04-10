from typing import Optional
from datetime import datetime, timedelta
from sqlmodel import SQLModel, Field


def _default_expires_at() -> datetime:
    return datetime.now() + timedelta(hours=24)


class InvitationCode(SQLModel, table=True):
    __tablename__ = "invitation_code"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(unique=True, max_length=50)
    is_used: bool = Field(default=False)
    used_by_user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.now)
    expires_at: datetime = Field(default_factory=_default_expires_at)
    role: str = Field(default="user", max_length=20)
