from sqlmodel import SQLModel, Session, create_engine
from app.core.config import settings

# SQLite heeft connect_args nodig voor threading
connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args, echo=False)


def create_db_and_tables():
    """Create all tables defined via SQLModel metadata."""
    # Import models zodat ze geregistreerd zijn bij SQLModel.metadata
    import app.models  # noqa: F401
    SQLModel.metadata.create_all(engine)


def get_session():
    """FastAPI dependency die een database session oplevert."""
    with Session(engine) as session:
        yield session
