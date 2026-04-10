import json
from typing import Optional
from sqlmodel import SQLModel, Field


class Signup(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    activity_id: int = Field(foreign_key="activity.id")
    participant_name: str = Field(max_length=100)
    guests: int = Field(default=0)
    guest_names: str = Field(default="[]")  # JSON array van namen

    def get_guest_names(self) -> list[str]:
        try:
            return json.loads(self.guest_names)
        except Exception:
            return []

    def set_guest_names(self, names: list[str]) -> None:
        self.guest_names = json.dumps(names, ensure_ascii=False)
        self.guests = len(names)
