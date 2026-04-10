import secrets
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select, func

from app.core.database import get_session
from app.core.security import require_admin, hash_password
from app.models.user import User
from app.models.activity import Activity
from app.models.signup import Signup
from app.models.payment import Payment
from app.models.invitation_code import InvitationCode
from app.models.declaration import Declaration
from app.schemas.auth import UserResponse
from app.schemas.admin import UserUpdate, InviteCodeCreate, InviteCodeResponse

router = APIRouter()


# ---- Users ----

@router.get("/users", response_model=list[UserResponse])
def list_users(
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    users = session.exec(select(User)).all()
    return [UserResponse(**u.model_dump()) for u in users]


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    data: UserUpdate,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, "Gebruiker niet gevonden.")

    # Bescherm de hoofd-admin
    if user.username == "admin":
        if data.username and data.username != "admin":
            raise HTTPException(400, "De gebruikersnaam van de hoofd-admin kan niet worden gewijzigd.")
        if data.role and data.role != "admin":
            raise HTTPException(400, "De rol van de hoofd-admin kan niet worden gewijzigd.")

    if data.username and data.username != user.username:
        existing = session.exec(
            select(User).where(func.lower(User.username) == func.lower(data.username))
        ).first()
        if existing:
            raise HTTPException(400, "Deze gebruikersnaam is al in gebruik.")
        # Update ook signups
        signups = session.exec(
            select(Signup).where(Signup.participant_name == user.username)
        ).all()
        for s in signups:
            s.participant_name = data.username
            session.add(s)
        user.username = data.username

    if data.email and data.email != user.email:
        existing = session.exec(select(User).where(User.email == data.email)).first()
        if existing:
            raise HTTPException(400, "Dit e-mailadres is al in gebruik.")
        user.email = data.email

    if data.role:
        user.role = data.role

    if data.password:
        from app.schemas.auth import validate_password_strength
        try:
            validate_password_strength(data.password)
        except ValueError as e:
            raise HTTPException(400, str(e))
        user.password_hash = hash_password(data.password)

    session.add(user)
    session.commit()
    session.refresh(user)
    return UserResponse(**user.model_dump())


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, "Gebruiker niet gevonden.")
    if user.username == "admin":
        raise HTTPException(400, "Het hoofd-admin account kan niet worden verwijderd.")

    session.delete(user)
    session.commit()
    return {"message": f'Gebruiker "{user.username}" verwijderd.'}


# ---- Invite Codes ----

@router.get("/invite-codes", response_model=list[InviteCodeResponse])
def list_invite_codes(
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    codes = session.exec(
        select(InvitationCode).order_by(InvitationCode.created_at.desc())
    ).all()
    return [
        InviteCodeResponse(
            id=c.id,
            code=c.code,
            role=c.role,
            created_at=c.created_at.isoformat(),
        )
        for c in codes
    ]


@router.post("/invite-codes", response_model=InviteCodeResponse, status_code=201)
def create_invite_code(
    data: InviteCodeCreate,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    code = secrets.token_urlsafe(6)
    invite = InvitationCode(code=code, role=data.role)
    session.add(invite)
    session.commit()
    session.refresh(invite)
    return InviteCodeResponse(
        id=invite.id,
        code=invite.code,
        role=invite.role,
        created_at=invite.created_at.isoformat(),
    )


@router.delete("/invite-codes/{code_id}")
def delete_invite_code(
    code_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    code = session.get(InvitationCode, code_id)
    if not code:
        raise HTTPException(404, "Uitnodigingscode niet gevonden.")
    session.delete(code)
    session.commit()
    return {"message": "Uitnodigingscode verwijderd."}


# ---- Activities admin (alle activiteiten incl. verleden) ----

@router.get("/payments")
def admin_list_payments(
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    """Alle betalingen met gebruiker- en activiteitsinformatie."""
    payments = session.exec(
        select(Payment).order_by(Payment.id.desc())
    ).all()
    result = []
    for p in payments:
        user = session.get(User, p.user_id)
        activity = session.get(Activity, p.activity_id)
        if not user or not activity:
            continue
        date_str = activity.date.strftime("%Y%m%d")
        GUEST_SURCHARGE = 5
        total_amount = round(activity.cost + p.guests * (activity.cost + GUEST_SURCHARGE), 2) if activity.cost else 0
        pending_amount = round(total_amount - p.approved_amount, 2)
        signup = session.exec(
            select(Signup).where(
                Signup.activity_id == p.activity_id,
                Signup.participant_name == user.username,
            )
        ).first()
        guest_names = signup.get_guest_names() if signup else []
        result.append({
            "id": p.id,
            "status": p.status,
            "user_id": p.user_id,
            "username": user.username,
            "email": user.email,
            "activity_id": p.activity_id,
            "activity_name": activity.name,
            "activity_date": activity.date.isoformat(),
            "cost": activity.cost,
            "guests": p.guests,
            "guest_names": guest_names,
            "total_amount": total_amount,
            "approved_amount": p.approved_amount,
            "pending_amount": pending_amount,
            "reference": f"{p.activity_id}-{p.user_id}-{date_str}",
        })
    return result


@router.get("/statistics")
def admin_statistics(
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    """Inkomsten en uitgaven per activiteit."""
    GUEST_SURCHARGE = 5
    activities = session.exec(select(Activity).order_by(Activity.date.desc())).all()
    result = []
    for a in activities:
        signups = session.exec(select(Signup).where(Signup.activity_id == a.id)).all()
        participants = sum(1 + s.guests for s in signups)

        payments = session.exec(select(Payment).where(Payment.activity_id == a.id)).all()

        income_paid = sum(p.approved_amount for p in payments if p.status == "paid")
        income_pending = 0.0
        for p in payments:
            if p.status in ("pending_verification", "unpaid") and a.cost:
                total = a.cost + p.guests * (a.cost + GUEST_SURCHARGE)
                income_pending += max(0.0, total - p.approved_amount)

        declarations = session.exec(
            select(Declaration).where(
                Declaration.linked_to == "activity",
                Declaration.linked_id == a.id,
                Declaration.status == "approved",
            )
        ).all()
        expenses = sum(d.amount for d in declarations)

        result.append({
            "activity_id": a.id,
            "activity_name": a.name,
            "activity_date": a.date.isoformat(),
            "cost_per_person": a.cost,
            "participants": participants,
            "income_paid": round(income_paid, 2),
            "income_pending": round(income_pending, 2),
            "expenses": round(expenses, 2),
            "net": round(income_paid - expenses, 2),
        })
    return result


class AdminSignupRequest(BaseModel):
    user_id: int


@router.post("/signups/{activity_id}", status_code=201)
def admin_add_signup(
    activity_id: int,
    data: AdminSignupRequest,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    """Voeg een gebruiker hard toe aan een activiteit, zonder betaalcheck."""
    activity = session.get(Activity, activity_id)
    if not activity:
        raise HTTPException(404, "Activiteit niet gevonden.")

    user = session.get(User, data.user_id)
    if not user:
        raise HTTPException(404, "Gebruiker niet gevonden.")

    existing = session.exec(
        select(Signup).where(
            Signup.activity_id == activity_id,
            Signup.participant_name == user.username,
        )
    ).first()
    if existing:
        raise HTTPException(400, f"{user.username} is al aangemeld voor deze activiteit.")

    signup = Signup(activity_id=activity_id, participant_name=user.username)
    signup.set_guest_names([])
    session.add(signup)

    if activity.cost:
        existing_payment = session.exec(
            select(Payment).where(
                Payment.activity_id == activity_id,
                Payment.user_id == user.id,
            )
        ).first()
        if not existing_payment:
            payment = Payment(
                user_id=user.id,
                activity_id=activity_id,
                status="paid",
                guests=0,
                approved_amount=activity.cost,
            )
            session.add(payment)

    session.commit()
    return {"message": f"{user.username} is toegevoegd aan {activity.name}."}


@router.get("/activities")
def admin_list_activities(
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    activities = session.exec(select(Activity).order_by(Activity.date.desc())).all()
    today = date.today()
    result = []
    for a in activities:
        signups = session.exec(select(Signup).where(Signup.activity_id == a.id)).all()
        count = sum(1 + s.guests for s in signups)
        result.append({
            **a.model_dump(),
            "signups_count": count,
            "is_past": a.date < today,
        })
    return result
