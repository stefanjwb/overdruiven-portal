from typing import Optional
from datetime import datetime, date
from sqlmodel import SQLModel, Field, Column, Text


class Declaration(SQLModel, table=True):
    __tablename__ = "declaration"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    date: date
    amount: float
    article: str = Field(max_length=200)
    description: Optional[str] = None
    bank_account: str = Field(max_length=50)  # IBAN
    receipt: Optional[str] = Field(default=None, sa_column=Column(Text))  # base64
    receipt_filename: Optional[str] = Field(default=None, max_length=200)
    status: str = Field(default="pending", max_length=20)  # pending | approved | rejected
    admin_note: Optional[str] = None
    linked_to: Optional[str] = Field(default=None, max_length=20)  # activity | inventory | other
    linked_id: Optional[int] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.now)
