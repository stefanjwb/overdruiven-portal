from typing import Optional
from datetime import date as DateType

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, field_validator
from sqlmodel import Session, select
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.database import get_session
from app.core.security import get_current_user, require_admin
from app.models.user import User
from app.models.declaration import Declaration
from app.models.activity import Activity
from app.models.inventory import InventoryItem

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

MAX_DECLARATION_AMOUNT = 10_000.00
MAX_ARTICLE_LENGTH = 200
MAX_DESCRIPTION_LENGTH = 2000
MAX_RECEIPT_FILENAME_LENGTH = 255


class DeclarationCreate(BaseModel):
    date: DateType
    amount: float
    article: str
    description: Optional[str] = None
    bank_account: str
    receipt: Optional[str] = None
    receipt_filename: Optional[str] = None
    linked_to: Optional[str] = None   # activity | inventory | other
    linked_id: Optional[int] = None

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Bedrag moet groter zijn dan €0,00.")
        if v > MAX_DECLARATION_AMOUNT:
            raise ValueError(f"Bedrag mag niet groter zijn dan €{MAX_DECLARATION_AMOUNT:,.2f}.")
        return round(v, 2)

    @field_validator("article")
    @classmethod
    def validate_article(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Artikel mag niet leeg zijn.")
        if len(v) > MAX_ARTICLE_LENGTH:
            raise ValueError(f"Artikel mag maximaal {MAX_ARTICLE_LENGTH} tekens bevatten.")
        return v

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > MAX_DESCRIPTION_LENGTH:
            raise ValueError(f"Omschrijving mag maximaal {MAX_DESCRIPTION_LENGTH} tekens bevatten.")
        return v

    @field_validator("bank_account")
    @classmethod
    def validate_bank_account(cls, v: str) -> str:
        v = v.strip()
        if len(v) > 34:  # IBAN maximale lengte
            raise ValueError("Ongeldig rekeningnummer.")
        return v

    @field_validator("linked_to")
    @classmethod
    def validate_linked_to(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("activity", "inventory", "other"):
            raise ValueError("Ongeldig type koppeling.")
        return v

    @field_validator("receipt_filename")
    @classmethod
    def validate_receipt_filename(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > MAX_RECEIPT_FILENAME_LENGTH:
            raise ValueError("Bestandsnaam is te lang.")
        return v


class StatusUpdate(BaseModel):
    status: str  # approved | rejected
    admin_note: Optional[str] = None


def _resolve_linked_label(d: Declaration, session: Session) -> Optional[str]:
    if d.linked_to == "activity" and d.linked_id:
        a = session.get(Activity, d.linked_id)
        return a.name if a else None
    if d.linked_to == "inventory" and d.linked_id:
        i = session.get(InventoryItem, d.linked_id)
        return i.name if i else None
    return None


def _format_declaration(d: Declaration, user: User, include_sensitive: bool = False, linked_label: Optional[str] = None) -> dict:
    result = {
        "id": d.id,
        "user_id": d.user_id,
        "username": user.username,
        "email": user.email,
        "date": d.date,
        "amount": d.amount,
        "article": d.article,
        "description": d.description,
        "receipt_filename": d.receipt_filename,
        "status": d.status,
        "admin_note": d.admin_note,
        "linked_to": d.linked_to,
        "linked_id": d.linked_id,
        "linked_label": linked_label,
        "created_at": d.created_at,
    }
    if include_sensitive:
        result["bank_account"] = d.bank_account
        result["receipt"] = d.receipt
    return result


@router.post("/")
@limiter.limit("10/minute")
def create_declaration(
    request: Request,
    body: DeclarationCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    declaration = Declaration(
        user_id=current_user.id,
        date=body.date,
        amount=body.amount,
        article=body.article,
        description=body.description,
        bank_account=body.bank_account,
        receipt=body.receipt,
        receipt_filename=body.receipt_filename,
        linked_to=body.linked_to,
        linked_id=body.linked_id,
    )
    session.add(declaration)
    session.commit()
    session.refresh(declaration)
    label = _resolve_linked_label(declaration, session)
    return _format_declaration(declaration, current_user, include_sensitive=True, linked_label=label)


@router.get("/me")
def get_my_declarations(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    declarations = session.exec(
        select(Declaration)
        .where(Declaration.user_id == current_user.id)
        .order_by(Declaration.created_at.desc())  # type: ignore[arg-type]
    ).all()
    return [_format_declaration(d, current_user, include_sensitive=True, linked_label=_resolve_linked_label(d, session)) for d in declarations]


@router.get("/")
def get_all_declarations(
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    declarations = session.exec(
        select(Declaration).order_by(Declaration.created_at.desc())  # type: ignore[arg-type]
    ).all()
    results = []
    for d in declarations:
        user = session.get(User, d.user_id)
        if user:
            label = _resolve_linked_label(d, session)
            results.append(_format_declaration(d, user, include_sensitive=True, linked_label=label))
    return results


@router.put("/{declaration_id}/status")
def update_status(
    declaration_id: int,
    body: StatusUpdate,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    if body.status not in ("approved", "rejected"):
        raise HTTPException(400, "Status moet 'approved' of 'rejected' zijn.")
    declaration = session.get(Declaration, declaration_id)
    if not declaration:
        raise HTTPException(404, "Declaratie niet gevonden.")
    declaration.status = body.status
    declaration.admin_note = body.admin_note
    session.commit()
    user = session.get(User, declaration.user_id)
    label = _resolve_linked_label(declaration, session)
    return _format_declaration(declaration, user, include_sensitive=True, linked_label=label)  # type: ignore[arg-type]


@router.delete("/{declaration_id}")
def delete_declaration(
    declaration_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    declaration = session.get(Declaration, declaration_id)
    if not declaration:
        raise HTTPException(404, "Declaratie niet gevonden.")

    is_admin = current_user.role == "admin"
    is_owner = declaration.user_id == current_user.id

    if not is_admin and not is_owner:
        raise HTTPException(403, "Geen toegang.")

    if is_owner and not is_admin and declaration.status != "pending":
        raise HTTPException(400, "Je kunt alleen openstaande declaraties verwijderen.")

    session.delete(declaration)
    session.commit()
    return {"message": "Declaratie verwijderd."}
