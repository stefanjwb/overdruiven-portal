from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, field_validator
from sqlmodel import Session, select
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.database import get_session
from app.core.security import get_current_user, require_admin
from app.models.user import User
from app.models.activity import Activity
from app.models.signup import Signup

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

MAX_GUESTS = 10
MAX_GUEST_NAME_LENGTH = 100


class SignupRequest(BaseModel):
    guest_names: list[str] = []
    guest_eats: list[bool] = []
    eats_along: bool = True

    @field_validator("guest_names")
    @classmethod
    def validate_guest_names(cls, names: list[str]) -> list[str]:
        cleaned = [n.strip() for n in names if n.strip()]
        if len(cleaned) > MAX_GUESTS:
            raise ValueError(f"Je kunt maximaal {MAX_GUESTS} gasten opgeven.")
        for name in cleaned:
            if len(name) > MAX_GUEST_NAME_LENGTH:
                raise ValueError(f"Gastnaam mag maximaal {MAX_GUEST_NAME_LENGTH} tekens bevatten.")
        return cleaned


def _total_headcount(session: Session, activity_id: int) -> int:
    """Tel het totaal aantal mensen (aangemelden + gasten) voor een activiteit."""
    signups = session.exec(select(Signup).where(Signup.activity_id == activity_id)).all()
    return sum(1 + s.guests for s in signups)


@router.post("/{activity_id}")
@limiter.limit("20/minute")
def signup_for_activity(
    request: Request,
    activity_id: int,
    body: SignupRequest = SignupRequest(),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Meld de ingelogde gebruiker aan voor een activiteit."""
    activity = session.get(Activity, activity_id)
    if not activity:
        raise HTTPException(404, "Activiteit niet gevonden.")

    existing = session.exec(
        select(Signup).where(
            Signup.activity_id == activity_id,
            Signup.participant_name == current_user.username,
        )
    ).first()
    if existing:
        raise HTTPException(400, "Je bent al aangemeld voor deze activiteit.")

    guest_count = len(body.guest_names)

    if activity.max_participants is not None:
        current_total = _total_headcount(session, activity_id)
        if current_total + 1 + guest_count > activity.max_participants:
            raise HTTPException(400, "Er zijn niet genoeg plaatsen meer voor jou en je gasten.")

    signup = Signup(activity_id=activity_id, participant_name=current_user.username, eats_along=body.eats_along)
    signup.set_guest_names(body.guest_names)
    signup.set_guest_eats(body.guest_eats)
    session.add(signup)
    session.commit()
    return {"message": f"Succesvol aangemeld voor {activity.name}."}


class EatsAlongUpdate(BaseModel):
    eats_along: bool


@router.patch("/me/{activity_id}")
def update_my_eats_along(
    activity_id: int,
    body: EatsAlongUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Wijzig of je mee-eet bij een activiteit waarvoor je bent aangemeld."""
    signup = session.exec(
        select(Signup).where(
            Signup.activity_id == activity_id,
            Signup.participant_name == current_user.username,
        )
    ).first()
    if not signup:
        raise HTTPException(404, "Je bent niet aangemeld voor deze activiteit.")
    signup.eats_along = body.eats_along
    session.add(signup)
    session.commit()
    return {"eats_along": signup.eats_along}


@router.get("/me")
def my_signups(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Geeft de activity_ids terug waarvoor de huidige gebruiker is aangemeld."""
    signups = session.exec(
        select(Signup).where(Signup.participant_name == current_user.username)
    ).all()
    return [s.activity_id for s in signups]


@router.delete("/me/{activity_id}")
def cancel_my_signup(
    activity_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Annuleer eigen aanmelding voor een activiteit."""
    signup = session.exec(
        select(Signup).where(
            Signup.activity_id == activity_id,
            Signup.participant_name == current_user.username,
        )
    ).first()
    if not signup:
        raise HTTPException(404, "Je bent niet aangemeld voor deze activiteit.")
    session.delete(signup)
    session.commit()
    return {"message": "Aanmelding geannuleerd."}


@router.delete("/{signup_id}")
def delete_signup(
    signup_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    signup = session.get(Signup, signup_id)
    if not signup:
        raise HTTPException(404, "Aanmelding niet gevonden.")

    name = signup.participant_name
    session.delete(signup)
    session.commit()
    return {"message": f"Aanmelding van {name} verwijderd."}


@router.delete("/{signup_id}/guests/{guest_index}")
def delete_guest(
    signup_id: int,
    guest_index: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    """Verwijder een specifieke gast uit een aanmelding (admin only)."""
    signup = session.get(Signup, signup_id)
    if not signup:
        raise HTTPException(404, "Aanmelding niet gevonden.")

    names = signup.get_guest_names()
    eats = signup.get_guest_eats()
    if guest_index < 0 or guest_index >= len(names):
        raise HTTPException(404, "Gast niet gevonden.")

    removed = names.pop(guest_index)
    if guest_index < len(eats):
        eats.pop(guest_index)
    signup.set_guest_names(names)
    signup.set_guest_eats(eats)
    session.add(signup)
    session.commit()
    return {"message": f"Gast '{removed}' verwijderd."}
