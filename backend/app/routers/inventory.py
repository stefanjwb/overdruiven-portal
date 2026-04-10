from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.core.database import get_session
from app.core.security import require_admin
from app.models.inventory import InventoryItem

router = APIRouter()


class InventoryItemCreate(BaseModel):
    name: str
    category: Optional[str] = None
    quantity: int = 1
    description: Optional[str] = None
    notes: Optional[str] = None


class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[int] = None
    description: Optional[str] = None
    notes: Optional[str] = None


@router.get("/")
def list_items(session: Session = Depends(get_session), _=Depends(require_admin)):
    return session.exec(select(InventoryItem).order_by(InventoryItem.category, InventoryItem.name)).all()


@router.post("/", status_code=201)
def create_item(data: InventoryItemCreate, session: Session = Depends(get_session), _=Depends(require_admin)):
    item = InventoryItem(**data.model_dump())
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.put("/{item_id}")
def update_item(item_id: int, data: InventoryItemUpdate, session: Session = Depends(get_session), _=Depends(require_admin)):
    item = session.get(InventoryItem, item_id)
    if not item:
        raise HTTPException(404, "Item niet gevonden.")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.delete("/{item_id}")
def delete_item(item_id: int, session: Session = Depends(get_session), _=Depends(require_admin)):
    item = session.get(InventoryItem, item_id)
    if not item:
        raise HTTPException(404, "Item niet gevonden.")
    session.delete(item)
    session.commit()
    return {"message": "Item verwijderd."}
