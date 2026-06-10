from pydantic import BaseModel
from typing import Optional
from datetime import date


class ActivityCreate(BaseModel):
    name: str
    description: Optional[str] = None
    date: date
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    max_participants: Optional[int] = None
    location: Optional[str] = None
    is_public: bool = False
    cost: Optional[float] = None
    organizer_id: Optional[int] = None
    shopper_id: Optional[int] = None
    cook_ids: list[int] = []
    add_to_calendar: bool = True


class ActivityUpdate(BaseModel):
    name: str
    description: Optional[str] = None
    date: date
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    max_participants: Optional[int] = None
    location: Optional[str] = None
    is_public: bool = False
    cost: Optional[float] = None
    organizer_id: Optional[int] = None
    shopper_id: Optional[int] = None
    cook_ids: list[int] = []


class ActivityResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    date: date
    start_time: Optional[str]
    end_time: Optional[str]
    max_participants: Optional[int]
    location: Optional[str]
    is_public: bool
    cost: Optional[float]
    organizer_id: Optional[int]
    organizer_name: Optional[str] = None
    shopper_id: Optional[int] = None
    shopper_name: Optional[str] = None
    cook_ids: list[int] = []
    cook_names: list[str] = []
    signups_count: int = 0
    google_event_id: Optional[str] = None


class SignupResponse(BaseModel):
    id: int
    participant_name: str
    user_id: Optional[int] = None
    payment_status: Optional[str] = None
    payment_id: Optional[int] = None
    guests: int = 0
    guest_names: list[str] = []
    guest_eats: list[bool] = []
    eats_along: bool = True
