from datetime import date

from fastapi import APIRouter, Depends, Request
from sqlmodel import Session, select
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.database import get_session
from app.models.activity import Activity
from app.models.signup import Signup
from app.schemas.admin import ContactRequest
from app.schemas.activity import ActivityResponse
from app.services.email_service import send_contact_email

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.get("/", response_model=list[ActivityResponse])
def public_home(session: Session = Depends(get_session)):
    """Geeft alle toekomstige openbare activiteiten terug."""
    today = date.today()
    activities = session.exec(
        select(Activity)
        .where(Activity.is_public == True, Activity.date >= today)
        .order_by(Activity.date)
    ).all()

    result = []
    for a in activities:
        count = len(session.exec(select(Signup).where(Signup.activity_id == a.id)).all())
        result.append(ActivityResponse(
            **a.model_dump(),
            signups_count=count,
        ))
    return result


@router.post("/contact")
@limiter.limit("5/10minute")
def contact(request: Request, data: ContactRequest):
    """Verstuur een lidmaatschapsaanvraag per e-mail."""
    # Honeypot: als het verborgen veld ingevuld is, is het een bot — stil negeren
    if data.website:
        return {"message": "Bedankt voor je aanvraag! We nemen zo snel mogelijk contact met je op."}
    send_contact_email(name=data.name, email=data.email, message=data.message)
    return {"message": "Bedankt voor je aanvraag! We nemen zo snel mogelijk contact met je op."}
