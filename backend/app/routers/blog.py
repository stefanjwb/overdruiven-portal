from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.core.database import get_session
from app.core.security import require_organizer
from app.models.blog import BlogPost
from app.models.user import User

router = APIRouter()


class BlogPostCreate(BaseModel):
    title: str
    content: str
    image: Optional[str] = None
    published: bool = False


class BlogPostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    image: Optional[str] = None
    remove_image: bool = False
    published: Optional[bool] = None


def post_to_dict(post: BlogPost, session: Session) -> dict:
    author = session.get(User, post.author_id)
    author_name = None
    if author:
        author_name = author.first_name or author.username
    return {
        "id": post.id,
        "title": post.title,
        "content": post.content,
        "image": post.image,
        "published": post.published,
        "author_name": author_name,
        "created_at": post.created_at.isoformat(),
        "updated_at": post.updated_at.isoformat(),
    }


# ---- Publiek ----

@router.get("/")
def list_published_posts(session: Session = Depends(get_session)):
    """Alle gepubliceerde blogposts, nieuwste eerst."""
    posts = session.exec(
        select(BlogPost)
        .where(BlogPost.published == True)
        .order_by(BlogPost.created_at.desc())
    ).all()
    return [post_to_dict(p, session) for p in posts]


# ---- Beheer (organizer / admin) ----

@router.get("/manage")
def list_all_posts(
    current_user: User = Depends(require_organizer),
    session: Session = Depends(get_session),
):
    """Alle blogposts inclusief concepten."""
    posts = session.exec(
        select(BlogPost).order_by(BlogPost.created_at.desc())
    ).all()
    return [post_to_dict(p, session) for p in posts]


@router.post("/", status_code=201)
def create_post(
    data: BlogPostCreate,
    current_user: User = Depends(require_organizer),
    session: Session = Depends(get_session),
):
    if not data.title.strip() or not data.content.strip():
        raise HTTPException(400, "Titel en inhoud zijn verplicht.")
    post = BlogPost(
        title=data.title.strip(),
        content=data.content,
        image=data.image,
        published=data.published,
        author_id=current_user.id,
    )
    session.add(post)
    session.commit()
    session.refresh(post)
    return post_to_dict(post, session)


@router.put("/{post_id}")
def update_post(
    post_id: int,
    data: BlogPostUpdate,
    current_user: User = Depends(require_organizer),
    session: Session = Depends(get_session),
):
    post = session.get(BlogPost, post_id)
    if not post:
        raise HTTPException(404, "Blogpost niet gevonden.")

    if data.title is not None:
        if not data.title.strip():
            raise HTTPException(400, "Titel mag niet leeg zijn.")
        post.title = data.title.strip()
    if data.content is not None:
        if not data.content.strip():
            raise HTTPException(400, "Inhoud mag niet leeg zijn.")
        post.content = data.content
    if data.remove_image:
        post.image = None
    elif data.image is not None:
        post.image = data.image
    if data.published is not None:
        post.published = data.published
    post.updated_at = datetime.now(timezone.utc)

    session.add(post)
    session.commit()
    session.refresh(post)
    return post_to_dict(post, session)


@router.delete("/{post_id}")
def delete_post(
    post_id: int,
    current_user: User = Depends(require_organizer),
    session: Session = Depends(get_session),
):
    post = session.get(BlogPost, post_id)
    if not post:
        raise HTTPException(404, "Blogpost niet gevonden.")
    session.delete(post)
    session.commit()
    return {"message": "Blogpost verwijderd."}


# ---- Publieke detailpagina (na /manage zodat routing klopt) ----

@router.get("/{post_id}")
def get_post(post_id: int, session: Session = Depends(get_session)):
    """Eén gepubliceerde blogpost."""
    post = session.get(BlogPost, post_id)
    if not post or not post.published:
        raise HTTPException(404, "Blogpost niet gevonden.")
    return post_to_dict(post, session)
