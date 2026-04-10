from typing import Optional
from sqlmodel import SQLModel, Field


class InventoryItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=200)
    category: Optional[str] = Field(default=None, max_length=100)
    quantity: int = Field(default=1)
    description: Optional[str] = None
    notes: Optional[str] = None
