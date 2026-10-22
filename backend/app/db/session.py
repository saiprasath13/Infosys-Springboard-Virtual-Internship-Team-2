from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import StaticPool

from app.core.config import settings


def normalize_database_url(url: str) -> str:
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    if not url.startswith("postgresql+asyncpg://"):
        return url

    parsed = urlsplit(url)
    query = parse_qsl(parsed.query, keep_blank_values=True)
    sslmode = next((value for key, value in query if key.lower() == "sslmode"), None)
    has_ssl = any(key.lower() == "ssl" for key, _ in query)
    query = [
        (key, value)
        for key, value in query
        if key.lower() not in {"sslmode", "channel_binding"}
    ]
    if sslmode is not None and not has_ssl:
        query.append(("ssl", sslmode))

    return urlunsplit(parsed._replace(query=urlencode(query)))


database_url = normalize_database_url(settings.DATABASE_URL)

if settings.USE_SQLITE_FALLBACK and database_url.startswith(("postgresql", "postgres")):
    database_url = "sqlite+aiosqlite:///./negotiation_arena.db"

engine_kwargs = {
    "echo": settings.ENVIRONMENT == "development",
    "pool_pre_ping": True,
}
if database_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False, "timeout": 30}
    engine_kwargs["poolclass"] = StaticPool

engine = create_async_engine(
    database_url,
    **engine_kwargs,
)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
