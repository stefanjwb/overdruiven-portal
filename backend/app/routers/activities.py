from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.core.database import get_session
from app.core.security import get_current_user, require_organizer, require_admin
from app.models.user import User
from app.models.activity import Activity
from app.models.signup import Signup
from app.models.payment import Payment
from app.schemas.activity import (
    ActivityCreate,
    ActivityUpdate,
    ActivityResponse,
    SignupResponse,
)
from app.services.calendar_service import (
    create_calendar_event,
    update_calendar_event,
    delete_calendar_event,
)

router = APIRouter()


def _display_name(user: Optional[User]) -> Optional[str]:
    if not user:
        return None
    return user.first_name.strip().capitalize() if user.first_name else user.username


def _enrich_activity(activity: Activity, session: Session) -> ActivityResponse:
    """Voeg extra velden toe aan een ActivityResponse."""
    signups = session.exec(select(Signup).where(Signup.activity_id == activity.id)).all()
    count = sum(1 + s.guests for s in signups)
    organizer = session.get(User, activity.organizer_id) if activity.organizer_id else None
    shopper = session.get(User, activity.shopper_id) if activity.shopper_id else None
    cook_ids = activity.get_cook_ids()
    cook_names = [n for n in (_display_name(session.get(User, cid)) for cid in cook_ids) if n]
    return ActivityResponse(
        **activity.model_dump(exclude={"cooks"}),
        signups_count=count,
        organizer_name=organizer.username if organizer else None,
        shopper_name=_display_name(shopper),
        cook_ids=cook_ids,
        cook_names=cook_names,
    )


@router.get("/", response_model=list[ActivityResponse])
def list_activities(
    include_past: bool = Query(False),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Alle (toekomstige) activiteiten voor ingelogde gebruikers."""
    query = select(Activity).order_by(Activity.date)
    if not include_past:
        query = query.where(Activity.date >= date.today())
    activities = session.exec(query).all()
    return [_enrich_activity(a, session) for a in activities]


@router.get("/organizers", response_model=list[dict])
def list_organizers(
    current_user: User = Depends(require_organizer),
    session: Session = Depends(get_session),
):
    """Geeft een lijst van alle gebruikers (voor de organisator-dropdown bij een activiteit)."""
    users = session.exec(select(User).order_by(User.username)).all()
    return [{"id": u.id, "username": u.username} for u in users]


@router.get("/{activity_id}", response_model=ActivityResponse)
def get_activity(
    activity_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    activity = session.get(Activity, activity_id)
    if not activity:
        raise HTTPException(404, "Activiteit niet gevonden.")
    return _enrich_activity(activity, session)


@router.get("/{activity_id}/signups", response_model=list[SignupResponse])
def get_signups(
    activity_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Haal alle aanmeldingen op, met betalingsstatus als admin."""
    activity = session.get(Activity, activity_id)
    if not activity:
        raise HTTPException(404, "Activiteit niet gevonden.")

    signups = session.exec(select(Signup).where(Signup.activity_id == activity_id)).all()
    result = []
    for s in signups:
        user = session.exec(select(User).where(User.username == s.participant_name)).first()
        payment = None
        if user:
            payment = session.exec(
                select(Payment).where(
                    Payment.user_id == user.id, Payment.activity_id == activity_id
                )
            ).first()

        if user and user.first_name:
            display_name = user.first_name.strip().capitalize()
        else:
            display_name = s.participant_name.split('.')[0].capitalize()

        result.append(SignupResponse(
            id=s.id,
            participant_name=display_name,
            user_id=user.id if user else None,
            payment_status=payment.status if payment else None,
            payment_id=payment.id if payment else None,
            guests=s.guests,
            guest_names=s.get_guest_names(),
            guest_eats=s.get_guest_eats(),
            eats_along=s.eats_along,
        ))
    return result


@router.post("/", response_model=ActivityResponse, status_code=201)
def create_activity(
    data: ActivityCreate,
    current_user: User = Depends(require_organizer),
    session: Session = Depends(get_session),
):
    activity = Activity(**data.model_dump(exclude={'add_to_calendar', 'cook_ids'}))
    activity.set_cook_ids(data.cook_ids)

    # Google Calendar
    if data.add_to_calendar:
        event_id = create_calendar_event(activity)
        if event_id:
            activity.google_event_id = event_id

    session.add(activity)
    session.commit()
    session.refresh(activity)
    return _enrich_activity(activity, session)


@router.put("/{activity_id}", response_model=ActivityResponse)
def update_activity(
    activity_id: int,
    data: ActivityUpdate,
    current_user: User = Depends(require_organizer),
    session: Session = Depends(get_session),
):
    activity = session.get(Activity, activity_id)
    if not activity:
        raise HTTPException(404, "Activiteit niet gevonden.")

    is_admin = current_user.role == "admin"
    if not is_admin and activity.organizer_id != current_user.id:
        raise HTTPException(403, "Je mag alleen je eigen activiteiten bewerken.")

    update_data = data.model_dump(exclude_unset=True)
    # Alleen admins mogen de organisator wijzigen
    if not is_admin:
        update_data.pop("organizer_id", None)

    cook_ids = update_data.pop("cook_ids", None)
    if cook_ids is not None:
        activity.set_cook_ids(cook_ids)

    for key, value in update_data.items():
        setattr(activity, key, value)

    update_calendar_event(activity)

    session.add(activity)
    session.commit()
    session.refresh(activity)
    return _enrich_activity(activity, session)


@router.delete("/{activity_id}")
def delete_activity(
    activity_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    activity = session.get(Activity, activity_id)
    if not activity:
        raise HTTPException(404, "Activiteit niet gevonden.")

    if activity.google_event_id:
        delete_calendar_event(activity.google_event_id)

    session.delete(activity)
    session.commit()
    return {"message": "Activiteit verwijderd."}
