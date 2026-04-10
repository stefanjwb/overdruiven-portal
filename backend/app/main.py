from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.sessions import SessionMiddleware
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.database import create_db_and_tables
from app.routers import auth, activities, signups, payments, admin, public, wines, inventory, declarations

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables on startup."""
    create_db_and_tables()
    yield


app = FastAPI(
    title="Chateau Overdruiven API",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# SessionMiddleware
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)

# CORS — sta de React dev server toe, credentials vereist voor cookies
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)


# Security headers op elke response
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'none'; "
        "frame-ancestors 'none';"
    )
    return response


# Routers
app.include_router(public.router, prefix="/public", tags=["Public"])
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(activities.router, prefix="/activities", tags=["Activities"])
app.include_router(signups.router, prefix="/signups", tags=["Signups"])
app.include_router(payments.router, prefix="/payments", tags=["Payments"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(wines.router, prefix="/wines", tags=["Wines"])
app.include_router(inventory.router, prefix="/inventory", tags=["Inventory"])
app.include_router(declarations.router, prefix="/declarations", tags=["Declarations"])


@app.get("/health")
def health_check():
    return {"status": "ok"}
