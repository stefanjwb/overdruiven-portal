from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session, select
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings
from app.core.database import get_session
from app.core.security import get_current_user, require_admin
from app.models.user import User
from app.models.activity import Activity
from app.models.signup import Signup
from app.models.payment import Payment
from app.services.email_service import (
    send_payment_approved_email,
    send_payment_rejected_email,
)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


class ConfirmPaymentRequest(BaseModel):
    guest_names: list[str] = []


@router.get("/info/{activity_id}")
def payment_info(
    activity_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Geeft betaalgegevens terug (IBAN, naam, omschrijving) voor een activiteit."""
    activity = session.get(Activity, activity_id)
    if not activity:
        raise HTTPException(404, "Activiteit niet gevonden.")

    date_str = activity.date.strftime("%Y%m%d")
    reference = f"{activity_id}-{current_user.id}-{date_str}"

    payment = session.exec(
        select(Payment).where(
            Payment.user_id == current_user.id,
            Payment.activity_id == activity_id,
        )
    ).first()

    # Haal guestnamen op uit de signup
    signup = session.exec(
        select(Signup).where(
            Signup.activity_id == activity_id,
            Signup.participant_name == current_user.username,
        )
    ).first()
    guest_names = signup.get_guest_names() if signup else []
    guests = len(guest_names)
    GUEST_SURCHARGE = 5
    total_amount = round(activity.cost + guests * (activity.cost + GUEST_SURCHARGE), 2) if activity.cost else 0

    return {
        "bank_account_number": settings.BANK_ACCOUNT_NUMBER,
        "bank_account_name": settings.BANK_ACCOUNT_NAME,
        "reference": reference,
        "cost": activity.cost,
        "guests": guests,
        "guest_names": guest_names,
        "total_amount": total_amount,
        "status": payment.status if payment else None,
        "payment_id": payment.id if payment else None,
    }


@router.post("/confirm/{activity_id}")
@limiter.limit("10/minute")
def confirm_payment(
    request: Request,
    activity_id: int,
    body: ConfirmPaymentRequest = ConfirmPaymentRequest(),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Gebruiker bevestigt dat hij/zij heeft betaald (of meldt zich aan bij gratis activiteit)."""
    activity = session.get(Activity, activity_id)
    if not activity:
        raise HTTPException(404, "Activiteit niet gevonden.")

    # Auto-signup als nog niet aangemeld
    existing_signup = session.exec(
        select(Signup).where(
            Signup.activity_id == activity_id,
            Signup.participant_name == current_user.username,
        )
    ).first()

    guest_count = len(body.guest_names)

    if not existing_signup:
        if activity.max_participants is not None:
            all_signups = session.exec(select(Signup).where(Signup.activity_id == activity_id)).all()
            total = sum(1 + s.guests for s in all_signups)
            if total + 1 + guest_count > activity.max_participants:
                raise HTTPException(400, "Er zijn niet genoeg plaatsen meer voor jou en je gasten.")

        signup = Signup(activity_id=activity_id, participant_name=current_user.username)
        signup.set_guest_names(body.guest_names)
        session.add(signup)
    else:
        existing_signup.set_guest_names(body.guest_names)
        session.add(existing_signup)

    # Betalingslogica (alleen als er kosten zijn)
    if activity.cost and activity.cost > 0:
        payment = session.exec(
            select(Payment).where(
                Payment.user_id == current_user.id,
                Payment.activity_id == activity_id,
            )
        ).first()

        if not payment:
            payment = Payment(
                user_id=current_user.id,
                activity_id=activity_id,
            )
            session.add(payment)

        payment.status = "pending_verification"
        payment.guests = guest_count

    session.commit()
    return {"message": "Aanmelding en betaling verwerkt."}


@router.get("/status/{activity_id}")
def get_payment_status(
    activity_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Haal de betalingsstatus op van de huidige gebruiker voor een activiteit."""
    payment = session.exec(
        select(Payment).where(
            Payment.user_id == current_user.id,
            Payment.activity_id == activity_id,
        )
    ).first()

    if not payment:
        return {"status": None}
    return {"status": payment.status, "payment_id": payment.id}


@router.post("/approve/{payment_id}")
def approve_payment(
    payment_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    payment = session.get(Payment, payment_id)
    if not payment:
        raise HTTPException(404, "Betaling niet gevonden.")

    if payment.status == "paid":
        return {"message": "Betaling is al goedgekeurd."}

    activity = session.get(Activity, payment.activity_id)
    GUEST_SURCHARGE = 5
    if activity and activity.cost:
        payment.approved_amount = round(
            activity.cost + payment.guests * (activity.cost + GUEST_SURCHARGE), 2
        )
    payment.status = "paid"
    session.commit()

    # Stuur bevestigingsmail
    user = session.get(User, payment.user_id)
    activity = session.get(Activity, payment.activity_id)
    if user and activity and user.email:
        send_payment_approved_email(
            username=user.username,
            email=user.email,
            activity_name=activity.name,
            activity_date=activity.date.strftime("%d-%m-%Y"),
            start_time=activity.start_time,
            location=activity.location,
        )

    return {"message": "Betaling goedgekeurd."}


@router.post("/reject/{payment_id}")
def reject_payment(
    payment_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    payment = session.get(Payment, payment_id)
    if not payment:
        raise HTTPException(404, "Betaling niet gevonden.")

    payment.status = "unpaid"
    session.commit()

    user = session.get(User, payment.user_id)
    activity = session.get(Activity, payment.activity_id)
    if user and activity and user.email:
        send_payment_rejected_email(
            username=user.username,
            email=user.email,
            activity_name=activity.name,
            activity_date=activity.date.strftime("%d-%m-%Y"),
            cost=activity.cost,
        )

    return {"message": "Betaling afgewezen."}
