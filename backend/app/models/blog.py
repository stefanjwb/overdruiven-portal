from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field


class BlogPost(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(max_length=200)
    content: str
    image: Optional[str] = None  # base64 data URL
    published: bool = Field(default=False)
    author_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
