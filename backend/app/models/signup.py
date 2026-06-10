import json
from typing import Optional
from sqlmodel import SQLModel, Field


class Signup(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    activity_id: int = Field(foreign_key="activity.id")
    participant_name: str = Field(max_length=100)
    guests: int = Field(default=0)
    guest_names: str = Field(default="[]")  # JSON array van namen
    eats_along: bool = Field(default=True)  # eet mee tijdens de activiteit
    guest_eats: str = Field(default="[]")   # JSON array van booleans, zelfde volgorde als guest_names

    def get_guest_names(self) -> list[str]:
        try:
            return json.loads(self.guest_names)
        except Exception:
            return []

    def set_guest_names(self, names: list[str]) -> None:
        self.guest_names = json.dumps(names, ensure_ascii=False)
        self.guests = len(names)

    def get_guest_eats(self) -> list[bool]:
        """Eet-mee-vlag per gast, altijd even lang als guest_names (default: eet mee)."""
        try:
            eats = [bool(e) for e in json.loads(self.guest_eats)]
        except Exception:
            eats = []
        n = self.guests
        return (eats + [True] * n)[:n]

    def set_guest_eats(self, eats: list[bool]) -> None:
        n = self.guests
        self.guest_eats = json.dumps((list(eats) + [True] * n)[:n])
