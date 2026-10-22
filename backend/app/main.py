from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi.responses import FileResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.db.session import engine, Base
from app.api.v1 import auth, users, negotiations, conversations, scenarios, reports

limiter = Limiter(key_func=get_remote_address)


async def initialize_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.ENVIRONMENT.lower() == "production":
        if settings.SECRET_KEY == "dev-secret-key-change-in-production-32chars!!" or len(settings.SECRET_KEY) < 32:
            raise RuntimeError("Set a unique SECRET_KEY of at least 32 characters in production.")
        if settings.USE_SQLITE_FALLBACK:
            raise RuntimeError("Disable USE_SQLITE_FALLBACK in production.")
        if not settings.DATABASE_URL.startswith(("postgres://", "postgresql://", "postgresql+asyncpg://")):
            raise RuntimeError("Production requires a PostgreSQL DATABASE_URL.")
    await initialize_database()
    yield


app = FastAPI(
    title="Negotiation Arena API",
    description="AI-powered multi-agent negotiation platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(negotiations.router, prefix="/api/v1/negotiations", tags=["negotiations"])
app.include_router(conversations.router, prefix="/api/v1/conversations", tags=["conversations"])
app.include_router(scenarios.router, prefix="/api/v1/scenarios", tags=["scenarios"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["reports"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


frontend_index = Path(__file__).resolve().parents[1] / "static" / "index.html"
if frontend_index.is_file():
    @app.get("/{frontend_path:path}", include_in_schema=False)
    async def serve_frontend(frontend_path: str):
        static_root = frontend_index.parent.resolve()
        requested_file = (static_root / frontend_path).resolve()
        if requested_file.is_relative_to(static_root) and requested_file.is_file():
            return FileResponse(requested_file)
        return FileResponse(frontend_index)
