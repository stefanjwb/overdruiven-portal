import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, HTTPException, Request, status
from jose import JWTError, jwt
from sqlmodel import Session

from app.core.config import settings
from app.core.database import get_session

# In-memory set van ingetrokken token-JTIs (wordt leeg bij herstart)
_revoked_jtis: set[str] = set()

BCRYPT_ROUNDS = 12
# bcrypt negeert alles voorbij 72 bytes; expliciet knippen voorkomt een
# ValueError bij (zeldzame) langere wachtwoorden, i.p.v. een 500-crash.
_BCRYPT_MAX_BYTES = 72


# ---------- Password hashing ----------

def hash_password(password: str) -> str:
    pw_bytes = password.encode("utf-8")[:_BCRYPT_MAX_BYTES]
    return bcrypt.hashpw(pw_bytes, bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode("utf-8")


def verify_password(plain: str, hashed: str | None) -> bool:
    if not hashed:
        return False
    try:
        return bcrypt.checkpw(plain.encode("utf-8")[:_BCRYPT_MAX_BYTES], hashed.encode("utf-8"))
    except ValueError:
        # Onherkenbaar/corrupt hash-formaat: behandel als "komt niet overeen".
        return False


# ---------- JWT tokens ----------

def _make_token(data: dict, expires_delta: timedelta) -> str:
    to_encode = data.copy()
    to_encode.update({
        "exp": datetime.now(timezone.utc) + expires_delta,
        "jti": str(uuid.uuid4()),
    })
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(data: dict) -> str:
    return _make_token(data, timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))


def create_refresh_token(user_id: int) -> str:
    return _make_token(
        {"sub": str(user_id), "type": "refresh"},
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )


def revoke_token(token: str) -> None:
    """Voeg een token-JTI toe aan de ingetrokken set (best-effort)."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        jti = payload.get("jti")
        if jti:
            _revoked_jtis.add(jti)
    except JWTError:
        pass


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ongeldig of verlopen token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    jti = payload.get("jti")
    if jti and jti in _revoked_jtis:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is ingetrokken.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


# ---------- Token extractie (cookie of Authorization-header) ----------

def _extract_token(request: Request) -> str:
    token = request.cookies.get("access_token")
    if token:
        return token
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Niet ingelogd.",
        headers={"WWW-Authenticate": "Bearer"},
    )


# ---------- Dependencies ----------

def get_current_user(
    request: Request,
    session: Session = Depends(get_session),
):
    """Haal de ingelogde gebruiker op uit de cookie of het Authorization-header."""
    from app.models.user import User  # lokale import om circulaire imports te voorkomen

    token = _extract_token(request)
    payload = decode_token(token)
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Token bevat geen gebruiker.")

    user = session.get(User, int(user_id))
    if user is None:
        raise HTTPException(status_code=401, detail="Gebruiker niet gevonden.")
    return user


def require_role(*roles: str):
    """Dependency factory: vereist dat de gebruiker een van de opgegeven rollen heeft."""
    def checker(current_user=Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Onvoldoende rechten.",
            )
        return current_user
    return checker


# Handige shortcuts
require_admin = require_role("admin")
require_organizer = require_role("admin", "organizer")
