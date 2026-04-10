from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.activity import Activity
from app.models.signup import Signup
from app.models.wine import Wine, UserWineNote

router = APIRouter()


class WineCreate(BaseModel):
    activity_id: int
    name: str
    producer: str
    vintage: Optional[int] = None
    country: str
    region: Optional[str] = None
    grape_varieties: list[str] = []
    wine_type: str
    tasting_note: Optional[str] = None
    description: Optional[str] = None
    body: Optional[str] = None
    alcohol_percentage: Optional[float] = None
    food_pairing: Optional[str] = None
    hidden: bool = False
    show_on_homepage: bool = False
    image: Optional[str] = None


class WineUpdate(BaseModel):
    name: Optional[str] = None
    producer: Optional[str] = None
    vintage: Optional[int] = None
    country: Optional[str] = None
    region: Optional[str] = None
    grape_varieties: Optional[list[str]] = None
    wine_type: Optional[str] = None
    tasting_note: Optional[str] = None
    description: Optional[str] = None
    body: Optional[str] = None
    alcohol_percentage: Optional[float] = None
    food_pairing: Optional[str] = None
    hidden: Optional[bool] = None
    show_on_homepage: Optional[bool] = None
    image: Optional[str] = None


class UserNoteUpdate(BaseModel):
    personal_note: Optional[str] = None
    rating: Optional[float] = None


def _can_manage_wines(user: User, activity: Activity) -> bool:
    """Globale organizer/admin, of de specifiek toegewezen organisator van de activiteit."""
    return user.role in ("admin", "organizer") or activity.organizer_id == user.id


def wine_to_dict(w: Wine, note: UserWineNote | None = None) -> dict:
    return {
        "id": w.id,
        "activity_id": w.activity_id,
        "name": w.name,
        "producer": w.producer,
        "vintage": w.vintage,
        "country": w.country,
        "region": w.region,
        "grape_varieties": w.get_grape_varieties(),
        "wine_type": w.wine_type,
        "tasting_note": w.tasting_note,
        "description": w.description,
        "body": w.body,
        "alcohol_percentage": w.alcohol_percentage,
        "food_pairing": w.food_pairing,
        "hidden": w.hidden,
        "show_on_homepage": w.show_on_homepage,
        "image": w.image,
        "personal_note": note.personal_note if note else None,
        "rating": note.rating if note else None,
    }


# ---- Publieke homepage wijnen ----

@router.get("/homepage")
def get_homepage_wines(session: Session = Depends(get_session)):
    """Publiek zichtbare wijnen voor op de homepagina."""
    wines = session.exec(
        select(Wine).where(Wine.show_on_homepage == True, Wine.hidden == False)
    ).all()
    result = []
    for w in wines:
        activity = session.get(Activity, w.activity_id)
        entry = wine_to_dict(w)
        entry["activity_name"] = activity.name if activity else None
        entry["activity_date"] = activity.date.isoformat() if activity else None
        result.append(entry)
    return result


# ---- Beheer (organizer / admin) ----

@router.get("/activity/{activity_id}")
def get_wines_for_activity(
    activity_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Alle wijnen voor een activiteit (ingelogde gebruikers)."""
    activity = session.get(Activity, activity_id)
    is_privileged = activity is not None and _can_manage_wines(current_user, activity)
    wines = session.exec(select(Wine).where(Wine.activity_id == activity_id)).all()
    result = []
    for w in wines:
        if w.hidden and not is_privileged:
            continue
        note = session.exec(
            select(UserWineNote).where(
                UserWineNote.wine_id == w.id,
                UserWineNote.user_id == current_user.id,
            )
        ).first()
        result.append(wine_to_dict(w, note))
    return result


@router.post("/", status_code=201)
def create_wine(
    data: WineCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    activity = session.get(Activity, data.activity_id)
    if not activity:
        raise HTTPException(404, "Activiteit niet gevonden.")
    if not _can_manage_wines(current_user, activity):
        raise HTTPException(403, "Onvoldoende rechten.")

    wine = Wine(
        activity_id=data.activity_id,
        name=data.name,
        producer=data.producer,
        vintage=data.vintage,
        country=data.country,
        region=data.region,
        wine_type=data.wine_type,
        tasting_note=data.tasting_note,
        description=data.description,
        body=data.body,
        alcohol_percentage=data.alcohol_percentage,
        food_pairing=data.food_pairing,
        hidden=data.hidden,
        show_on_homepage=data.show_on_homepage,
        image=data.image,
    )
    wine.set_grape_varieties(data.grape_varieties)
    session.add(wine)
    session.commit()
    session.refresh(wine)
    return wine_to_dict(wine)


@router.put("/{wine_id}")
def update_wine(
    wine_id: int,
    data: WineUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    wine = session.get(Wine, wine_id)
    if not wine:
        raise HTTPException(404, "Wijn niet gevonden.")
    activity = session.get(Activity, wine.activity_id)
    if not activity or not _can_manage_wines(current_user, activity):
        raise HTTPException(403, "Onvoldoende rechten.")

    for field in ["name", "producer", "vintage", "country", "region",
                  "wine_type", "tasting_note", "description", "body", "alcohol_percentage", "food_pairing"]:
        val = getattr(data, field)
        if val is not None:
            setattr(wine, field, val)
    if data.hidden is not None:
        wine.hidden = data.hidden
    if data.show_on_homepage is not None:
        wine.show_on_homepage = data.show_on_homepage
    if data.image is not None:
        wine.image = data.image
    if data.grape_varieties is not None:
        wine.set_grape_varieties(data.grape_varieties)

    session.add(wine)
    session.commit()
    session.refresh(wine)
    return wine_to_dict(wine)


@router.delete("/{wine_id}")
def delete_wine(
    wine_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    wine = session.get(Wine, wine_id)
    if not wine:
        raise HTTPException(404, "Wijn niet gevonden.")
    activity = session.get(Activity, wine.activity_id)
    if not activity or not _can_manage_wines(current_user, activity):
        raise HTTPException(403, "Onvoldoende rechten.")
    session.delete(wine)
    session.commit()
    return {"message": "Wijn verwijderd."}


# ---- Persoonlijke notities (leden) ----

@router.put("/{wine_id}/note")
def update_personal_note(
    wine_id: int,
    data: UserNoteUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Voeg een persoonlijke notitie en/of rating toe aan een wijn."""
    wine = session.get(Wine, wine_id)
    if not wine:
        raise HTTPException(404, "Wijn niet gevonden.")

    # Controleer of de gebruiker aangemeld is voor de activiteit
    signup = session.exec(
        select(Signup).where(
            Signup.activity_id == wine.activity_id,
            Signup.participant_name == current_user.username,
        )
    ).first()
    if not signup:
        raise HTTPException(403, "Je moet aangemeld zijn voor de activiteit om een notitie toe te voegen.")

    if data.rating is not None and not (0.5 <= data.rating <= 5):
        raise HTTPException(400, "Rating moet tussen 0.5 en 5 zijn.")

    note = session.exec(
        select(UserWineNote).where(
            UserWineNote.wine_id == wine_id,
            UserWineNote.user_id == current_user.id,
        )
    ).first()

    if not note:
        note = UserWineNote(wine_id=wine_id, user_id=current_user.id)
        session.add(note)

    if data.personal_note is not None:
        note.personal_note = data.personal_note
    if data.rating is not None:
        note.rating = data.rating

    session.commit()
    return wine_to_dict(wine, note)


# ---- Alle wijnen (ingelogde gebruikers) ----

@router.get("/library/all")
def all_wines(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Alle wijnen van alle activiteiten. Admins/organisatoren zien ook verborgen wijnen."""
    is_privileged = current_user.role in ("admin", "organizer")

    signups = session.exec(
        select(Signup).where(Signup.participant_name == current_user.username)
    ).all()
    attended_ids = {s.activity_id for s in signups}

    wines = session.exec(select(Wine).order_by(Wine.activity_id)).all()
    result = []
    for w in wines:
        if w.hidden and not is_privileged:
            continue
        activity = session.get(Activity, w.activity_id)
        attended = w.activity_id in attended_ids
        note = None
        if attended:
            note = session.exec(
                select(UserWineNote).where(
                    UserWineNote.wine_id == w.id,
                    UserWineNote.user_id == current_user.id,
                )
            ).first()
        entry = wine_to_dict(w, note)
        entry["activity_name"] = activity.name if activity else None
        entry["activity_date"] = activity.date.isoformat() if activity else None
        entry["attended"] = attended
        result.append(entry)
    return result


# ---- Persoonlijke bibliotheek ----

@router.get("/library/me")
def my_library(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Alle wijnen van activiteiten waarbij de gebruiker aangemeld is."""
    signups = session.exec(
        select(Signup).where(Signup.participant_name == current_user.username)
    ).all()
    activity_ids = [s.activity_id for s in signups]

    if not activity_ids:
        return []

    wines = session.exec(
        select(Wine).where(Wine.activity_id.in_(activity_ids))
    ).all()

    result = []
    for w in wines:
        activity = session.get(Activity, w.activity_id)
        if w.hidden and not _can_manage_wines(current_user, activity):
            continue
        note = session.exec(
            select(UserWineNote).where(
                UserWineNote.wine_id == w.id,
                UserWineNote.user_id == current_user.id,
            )
        ).first()
        entry = wine_to_dict(w, note)
        entry["activity_name"] = activity.name if activity else None
        entry["activity_date"] = activity.date.isoformat() if activity else None
        result.append(entry)

    return result
