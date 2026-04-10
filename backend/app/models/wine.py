import json
from typing import Optional
from sqlmodel import SQLModel, Field


class Wine(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    activity_id: int = Field(foreign_key="activity.id")
    name: str = Field(max_length=200)
    producer: str = Field(max_length=200)
    vintage: Optional[int] = None
    country: str = Field(max_length=100)
    region: Optional[str] = Field(default=None, max_length=100)
    grape_varieties: str = Field(default="[]")   # JSON array
    wine_type: str = Field(max_length=20)         # rood | wit | rosé | oranje
    tasting_note: Optional[str] = None
    description: Optional[str] = None
    body: Optional[str] = Field(default=None, max_length=20)  # licht | medium | vol
    alcohol_percentage: Optional[float] = None
    food_pairing: Optional[str] = None
    hidden: bool = Field(default=False)
    show_on_homepage: bool = Field(default=False)
    image: Optional[str] = None  # base64 data URL

    def get_grape_varieties(self) -> list[str]:
        try:
            return json.loads(self.grape_varieties)
        except Exception:
            return []

    def set_grape_varieties(self, varieties: list[str]) -> None:
        self.grape_varieties = json.dumps(varieties, ensure_ascii=False)


class UserWineNote(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    wine_id: int = Field(foreign_key="wine.id")
    user_id: int = Field(foreign_key="user.id")
    personal_note: Optional[str] = None
    rating: Optional[float] = None  # 0.5–5 in stappen van 0.5
