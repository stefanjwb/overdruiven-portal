from typing import Optional
from sqlmodel import SQLModel, Field


class Payment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    activity_id: int = Field(foreign_key="activity.id")
    status: str = Field(default="unpaid", max_length=30)  # unpaid | pending_verification | paid
    guests: int = Field(default=0)
    approved_amount: float = Field(default=0.0)  # bedrag dat al is goedgekeurd
