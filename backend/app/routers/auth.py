import hmac
import secrets
import string
import time
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select, func
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.database import get_session
from app.core.config import settings
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    revoke_token,
    decode_token,
    get_current_user,
)
from app.models.user import User
from app.models.invitation_code import InvitationCode
from app.schemas.auth import (
    CheckInviteRequest,
    SendCodeRequest,
    VerifyCodeRequest,
    RegisterRequest,
    UserResponse,
    validate_password_strength,
)
from app.services.email_service import send_verification_code, send_magic_link_email

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# In-memory store: email -> {code, expires_at, invite_role, first_name, last_name}
_pending: dict[str, dict] = {}

# In-memory magic link store: token -> {user_id, expires_at}
_magic_tokens: dict[str, dict] = {}

# Mislukte inlogpogingen: lowercase username -> {count, locked_until}
_failed_attempts: dict[str, dict] = {}

CODE_TTL = 15 * 60      # 15 minuten
MAGIC_TTL = 15 * 60     # 15 minuten
MAX_ATTEMPTS = 5
LOCKOUT_SECONDS = 15 * 60  # 15 minuten


def _generate_code() -> str:
    """Genereer een veilige 8-tekens alfanumerieke verificatiecode."""
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(8))


def _check_lockout(username: str) -> None:
    entry = _failed_attempts.get(username)
    if not entry:
        return
    locked_until = entry.get("locked_until", 0)
    if time.time() < locked_until:
        remaining = max(1, int((locked_until - time.time()) // 60) + 1)
        raise HTTPException(
            status_code=429,
            detail=f"Account tijdelijk geblokkeerd. Probeer het over {remaining} minuut/minuten opnieuw.",
        )


def _record_failure(username: str) -> None:
    entry = _failed_attempts.setdefault(username, {"count": 0, "locked_until": 0})
    entry["count"] += 1
    if entry["count"] >= MAX_ATTEMPTS:
        entry["locked_until"] = time.time() + LOCKOUT_SECONDS


def _clear_failure(username: str) -> None:
    _failed_attempts.pop(username, None)


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Zet HttpOnly-cookies voor access- en refresh-token."""
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.SECURE_COOKIES,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.SECURE_COOKIES,
        samesite="strict",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/",
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


# ---- Uitnodiging ----

def _cleanup_expired_invites(session) -> None:
    """Verwijder verlopen uitnodigingscodes uit de database."""
    expired = session.exec(
        select(InvitationCode).where(InvitationCode.expires_at < datetime.now())
    ).all()
    for inv in expired:
        session.delete(inv)
    if expired:
        session.commit()


@router.post("/check-invite", status_code=200)
def check_invite(data: CheckInviteRequest, session: Session = Depends(get_session)):
    _cleanup_expired_invites(session)
    invite = session.exec(
        select(InvitationCode).where(InvitationCode.code == data.invite_code.strip())
    ).first()
    if not invite:
        raise HTTPException(400, "Ongeldige of reeds gebruikte uitnodigingscode.")
    if invite.expires_at < datetime.now():
        raise HTTPException(400, "Deze uitnodigingscode is verlopen.")
    return {"valid": True}


# ---- Registratie ----

@router.post("/send-code", status_code=200)
@limiter.limit("3/10minute")
def send_code(request: Request, data: SendCodeRequest, session: Session = Depends(get_session)):
    invite = session.exec(
        select(InvitationCode).where(InvitationCode.code == data.invite_code.strip())
    ).first()
    if not invite:
        raise HTTPException(400, "Ongeldige of reeds gebruikte uitnodigingscode.")
    if invite.expires_at < datetime.now():
        raise HTTPException(400, "Deze uitnodigingscode is verlopen.")

    existing = session.exec(select(User).where(User.email == data.email)).first()
    if existing:
        raise HTTPException(400, "Dit e-mailadres is al in gebruik.")

    code = _generate_code()
    _pending[data.email] = {
        "code": code,
        "expires_at": time.time() + CODE_TTL,
        "invite_code": data.invite_code.strip(),
        "invite_role": invite.role,
        "first_name": data.first_name,
        "last_name": data.last_name,
    }

    send_verification_code(data.first_name, data.email, code)
    return {"sent": True}


@router.post("/verify-code", status_code=200)
@limiter.limit("5/10minute")
def verify_code(request: Request, data: VerifyCodeRequest):
    entry = _pending.get(data.email)
    if not entry:
        raise HTTPException(400, "Geen verificatiecode aangevraagd voor dit e-mailadres.")
    if time.time() > entry["expires_at"]:
        del _pending[data.email]
        raise HTTPException(400, "De verificatiecode is verlopen. Vraag een nieuwe aan.")
    # Constant-time vergelijking om timing-aanvallen te voorkomen
    if not hmac.compare_digest(entry["code"].upper(), data.code.strip().upper()):
        raise HTTPException(400, "Onjuiste verificatiecode.")
    return {"verified": True}


@router.post("/register", response_model=UserResponse, status_code=201)
def register(data: RegisterRequest, session: Session = Depends(get_session)):
    entry = _pending.get(data.email)
    if not entry:
        raise HTTPException(400, "Voltooi eerst de e-mailverificatie.")
    if time.time() > entry["expires_at"]:
        del _pending[data.email]
        raise HTTPException(400, "De verificatiecode is verlopen. Begin opnieuw.")

    existing = session.exec(select(User).where(User.email == data.email)).first()
    if existing:
        raise HTTPException(400, "Dit e-mailadres is al in gebruik.")

    invite = session.exec(
        select(InvitationCode).where(InvitationCode.code == entry["invite_code"])
    ).first()
    if not invite:
        raise HTTPException(400, "De uitnodigingscode is niet meer geldig.")

    base = f"{entry['first_name'].lower()}.{entry['last_name'].lower()}"
    base = "".join(c for c in base if c.isalnum() or c == ".")
    username = base
    suffix = 1
    while session.exec(select(User).where(func.lower(User.username) == username)).first():
        username = f"{base}{suffix}"
        suffix += 1

    new_user = User(
        username=username,
        email=data.email,
        password_hash=hash_password(data.password),
        role=invite.role,
        first_name=entry["first_name"],
        last_name=entry["last_name"],
        avatar=data.avatar,
    )
    session.add(new_user)
    session.delete(invite)
    session.commit()
    session.refresh(new_user)

    del _pending[data.email]
    return UserResponse(**new_user.model_dump())


# ---- Inloggen / uitloggen ----

@router.post("/login", status_code=200)
@limiter.limit("10/minute")
def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    username_lower = form_data.username.lower()
    _check_lockout(username_lower)

    user = session.exec(
        select(User).where(func.lower(User.username) == username_lower)
    ).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        _record_failure(username_lower)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ongeldige gebruikersnaam of wachtwoord.",
        )

    _clear_failure(username_lower)

    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token(user.id)
    _set_auth_cookies(response, access_token, refresh_token)
    return {"ok": True}


@router.post("/logout", status_code=200)
def logout(request: Request, response: Response):
    access_token = request.cookies.get("access_token")
    refresh_token = request.cookies.get("refresh_token")
    if access_token:
        revoke_token(access_token)
    if refresh_token:
        revoke_token(refresh_token)
    _clear_auth_cookies(response)
    return {"message": "Uitgelogd."}


@router.post("/refresh", status_code=200)
def refresh_tokens(
    request: Request,
    response: Response,
    session: Session = Depends(get_session),
):
    """Vernieuw de access-token via de refresh-token cookie."""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Geen refresh token aanwezig.")

    payload = decode_token(refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Ongeldig token type.")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Ongeldig token.")

    user = session.get(User, int(user_id))
    if not user:
        raise HTTPException(status_code=401, detail="Gebruiker niet gevonden.")

    # Roteer de refresh-token
    revoke_token(refresh_token)
    new_access = create_access_token({"sub": str(user.id), "role": user.role})
    new_refresh = create_refresh_token(user.id)
    _set_auth_cookies(response, new_access, new_refresh)
    return {"ok": True}


# ---- Magic link ----

@router.post("/magic-link", status_code=200)
@limiter.limit("3/10minute")
def request_magic_link(request: Request, data: dict, session: Session = Depends(get_session)):
    email = (data.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(400, "Vul een e-mailadres in.")

    user = session.exec(select(User).where(func.lower(User.email) == email)).first()
    if not user:
        return {"sent": True}  # Verberg of het e-mailadres bestaat

    token = str(uuid.uuid4())
    _magic_tokens[token] = {"user_id": user.id, "expires_at": time.time() + MAGIC_TTL}

    link = f"{settings.FRONTEND_URL}/magic-login?token={token}"
    send_magic_link_email(user.first_name or user.username, user.email, link)
    return {"sent": True}


@router.get("/magic-link/verify", status_code=200)
def verify_magic_link(token: str, response: Response, session: Session = Depends(get_session)):
    entry = _magic_tokens.get(token)
    if not entry:
        raise HTTPException(400, "Ongeldige of verlopen link.")
    if time.time() > entry["expires_at"]:
        del _magic_tokens[token]
        raise HTTPException(400, "De link is verlopen. Vraag een nieuwe aan.")

    user = session.get(User, entry["user_id"])
    if not user:
        raise HTTPException(400, "Gebruiker niet gevonden.")

    del _magic_tokens[token]
    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token(user.id)
    _set_auth_cookies(response, access_token, refresh_token)
    return {"ok": True}


# ---- Profiel ----

@router.patch("/me", response_model=UserResponse)
def update_me(
    data: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if "avatar" in data:
        current_user.avatar = data["avatar"]

    if data.get("new_password"):
        old_pw = data.get("current_password", "")
        if not current_user.password_hash or not verify_password(old_pw, current_user.password_hash):
            raise HTTPException(400, "Huidig wachtwoord klopt niet.")
        try:
            validate_password_strength(data["new_password"])
        except ValueError as e:
            raise HTTPException(400, str(e))
        current_user.password_hash = hash_password(data["new_password"])

    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return UserResponse(**current_user.model_dump())


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(**current_user.model_dump())
