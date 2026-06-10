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
    _migrate_columns()


def _migrate_columns():
    """Voeg nieuwe kolommen toe aan bestaande tabellen (create_all doet dat niet)."""
    migrations = {
        "activity": [
            ("shopper_id", "INTEGER REFERENCES user(id)"),
            ("cooks", "TEXT DEFAULT '[]'"),
        ],
        "signup": [
            ("eats_along", "BOOLEAN DEFAULT 1"),
            ("guest_eats", "TEXT DEFAULT '[]'"),
        ],
    }
    with engine.connect() as conn:
        for table, columns in migrations.items():
            existing = {row[1] for row in conn.exec_driver_sql(f"PRAGMA table_info({table})")}
            for name, ddl in columns:
                if name not in existing:
                    conn.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}")
        conn.commit()


def get_session():
    """FastAPI dependency die een database session oplevert."""
    with Session(engine) as session:
        yield session
