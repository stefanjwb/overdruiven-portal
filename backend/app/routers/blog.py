from datetime import datetime, timezone
from typing import Optional

import nh3
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.core.database import get_session
from app.core.security import require_organizer
from app.models.blog import BlogPost
from app.models.user import User

router = APIRouter()

# Ruim boven wat een normaal bericht nodig heeft (incl. enkele base64-afbeeldingen),
# maar voorkomt het opslaan van extreem grote payloads.
MAX_CONTENT_CHARS = 20_000_000
MAX_IMAGE_CHARS = 20_000_000

# Tags/attributen die de TipTap-editor produceert; al het andere wordt gestript.
ALLOWED_TAGS = {
    "p", "br", "strong", "b", "em", "i", "u", "s", "h1", "h2", "h3",
    "blockquote", "hr", "ul", "ol", "li", "a", "img", "code", "pre",
}
ALLOWED_ATTRIBUTES = {
    # rel wordt door nh3 zelf gezet (noopener noreferrer)
    "a": {"href", "target", "title"},
    "img": {"src", "alt", "title"},
    # style is nodig voor tekstuitlijning (text-align) uit de editor
    "p": {"style"}, "h1": {"style"}, "h2": {"style"}, "h3": {"style"},
}
# data: toegestaan voor base64-afbeeldingen in de tekst
ALLOWED_URL_SCHEMES = {"http", "https", "mailto", "data"}


def sanitize_content(html: str) -> str:
    """Server-side HTML-sanitization: verwijdert scripts, event handlers, etc."""
    return nh3.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        url_schemes=ALLOWED_URL_SCHEMES,
    )


def validate_image(image: Optional[str]) -> None:
    """Omslagfoto moet een data-URL van een afbeelding zijn (geen externe URL)."""
    if image is None or image == "":
        return
    if not image.startswith("data:image/"):
        raise HTTPException(400, "Afbeelding moet een geüploade afbeelding zijn (data-URL).")
    if len(image) > MAX_IMAGE_CHARS:
        raise HTTPException(400, "Afbeelding is te groot.")


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
    if len(data.content) > MAX_CONTENT_CHARS:
        raise HTTPException(400, "De inhoud is te groot.")
    validate_image(data.image)
    post = BlogPost(
        title=data.title.strip(),
        content=sanitize_content(data.content),
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
        if len(data.content) > MAX_CONTENT_CHARS:
            raise HTTPException(400, "De inhoud is te groot.")
        post.content = sanitize_content(data.content)
    if data.remove_image:
        post.image = None
    elif data.image is not None:
        validate_image(data.image)
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
