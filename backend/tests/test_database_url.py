from app.db.session import normalize_database_url


def test_normalize_neon_asyncpg_connection_url():
    url = (
        "postgresql://user:password@host.example/neondb"
        "?sslmode=require&channel_binding=require&application_name=arena"
    )

    normalized = normalize_database_url(url)

    assert normalized == (
        "postgresql+asyncpg://user:password@host.example/neondb"
        "?application_name=arena&ssl=require"
    )


def test_normalize_legacy_postgres_scheme():
    assert normalize_database_url("postgres://user:password@host/db") == (
        "postgresql+asyncpg://user:password@host/db"
    )


def test_leave_sqlite_url_unchanged():
    url = "sqlite+aiosqlite:///./negotiation_arena.db"

    assert normalize_database_url(url) == url
