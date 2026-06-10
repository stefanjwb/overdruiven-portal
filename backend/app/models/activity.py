import json
from typing import Optional
from datetime import date
from sqlmodel import SQLModel, Field


class Activity(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100)
    description: Optional[str] = None
    date: date
    start_time: Optional[str] = Field(default=None, max_length=50)
    end_time: Optional[str] = Field(default=None, max_length=50)
    max_participants: Optional[int] = None
    location: Optional[str] = Field(default=None, max_length=200)
    google_event_id: Optional[str] = Field(default=None, unique=True, max_length=255)
    is_public: bool = Field(default=False)
    cost: Optional[float] = None
    organizer_id: Optional[int] = Field(default=None, foreign_key="user.id")
    shopper_id: Optional[int] = Field(default=None, foreign_key="user.id")  # doet boodschappen
    cooks: str = Field(default="[]")  # JSON array van user-ids die koken

    def get_cook_ids(self) -> list[int]:
        try:
            return [int(i) for i in json.loads(self.cooks)]
        except Exception:
            return []

    def set_cook_ids(self, ids: list[int]) -> None:
        self.cooks = json.dumps(ids)
