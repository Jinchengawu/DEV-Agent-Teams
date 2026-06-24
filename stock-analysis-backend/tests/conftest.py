"""
E2E / Integration test fixtures for FundamentalsAI.

Uses SQLite for isolated testing. PostgreSQL-specific column types are
mapped to SQLite equivalents via SQLAlchemy's @compiles decorator.
"""
import asyncio
import os
import sys
from datetime import datetime, timezone
from typing import AsyncGenerator
from uuid import uuid4

# Ensure src is importable BEFORE model imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ═══════════════════════════════════════════════════════════════════════════
# Register @compiles rules: tell SQLite how to render PostgreSQL types.
# Must happen BEFORE importing any models or the database module!
# ═══════════════════════════════════════════════════════════════════════════
from sqlalchemy import JSON, String, Text, Integer, Float
from sqlalchemy.dialects.postgresql import JSONB, ARRAY, UUID as PG_UUID
from sqlalchemy.ext.compiler import compiles

@compiles(JSONB, "sqlite")
def _sqlite_jsonb(element, compiler, **kw):
    return "JSON"

@compiles(ARRAY, "sqlite")
def _sqlite_array(element, compiler, **kw):
    return "JSON"

@compiles(PG_UUID, "sqlite")
def _sqlite_uuid(element, compiler, **kw):
    return "CHAR(36)"

# Handle Enum types (used in models: MarketEnum, StatementType, Period, AnalysisType)
from sqlalchemy import Enum as SAEnum

@compiles(SAEnum, "sqlite")
def _sqlite_enum(element, compiler, **kw):
    return "VARCHAR(255)"


# Now safe to import models, database, and app
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.database import Base, get_db
from src.config import settings
# Import ALL models to ensure SQLAlchemy relationships are resolved
from src.models.user import User
from src.models.stock import Stock, MarketEnum
from src.models.financial import FinancialStatement, FinancialRatio, StatementType, Period
from src.models.watchlist import Watchlist, Alert, AnalysisNote
from src.models.ai_analysis import AIAnalysis, AnalysisType

# ── Override config for tests ──────────────────────────────────────────
settings.database_url = "sqlite+aiosqlite:///./test.db"
settings.debug = False
settings.jwt_secret_key = "test-secret-key-for-pytest"
settings.cors_origins = ["*"]


# ── Async engine & session for tests ───────────────────────────────────
_test_engine = None
_test_sessionmaker = None


@pytest_asyncio.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def engine():
    global _test_engine, _test_sessionmaker

    _test_engine = create_async_engine(
        "sqlite+aiosqlite:///./test.db",
        echo=False,
        connect_args={"check_same_thread": False},
    )

    async with _test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    _test_sessionmaker = async_sessionmaker(
        _test_engine, class_=AsyncSession, expire_on_commit=False
    )
    yield _test_engine

    # Cleanup
    async with _test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await _test_engine.dispose()
    if os.path.exists("./test.db"):
        os.remove("./test.db")

@pytest_asyncio.fixture(autouse=True)
async def db_session(engine) -> AsyncGenerator[AsyncSession, None]:
    """Provide a transactional database session for each test. Cleans up after."""
    global _test_sessionmaker
    async with _test_sessionmaker() as session:
        yield session
        # Clean all tables after each test so tests are isolated
        for table in reversed(Base.metadata.sorted_tables):
            await session.execute(table.delete())
        await session.commit()


# ── FastAPI app override ───────────────────────────────────────────────
from src.main import app


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def _get_db_override():
        yield db_session

    app.dependency_overrides[get_db] = _get_db_override
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


# ── Helper factories ───────────────────────────────────────────────────

@pytest_asyncio.fixture
async def registered_user(client: AsyncClient, db_session: AsyncSession) -> dict:
    """Register a user and return tokens + user info."""
    email = f"test_{uuid4().hex[:8]}@example.com"
    username = f"testuser_{uuid4().hex[:8]}"
    password = "TestPass123"

    resp = await client.post("/api/v1/auth/register", json={
        "email": email,
        "username": username,
        "password": password,
        "display_name": "Test User",
    })
    assert resp.status_code == 201, resp.text
    data = resp.json()

    resp2 = await client.post("/api/v1/auth/login", json={
        "username": username,
        "password": password,
    })
    assert resp2.status_code == 200, resp2.text
    tokens = resp2.json()

    return {
        "email": email,
        "username": username,
        "password": password,
        "user_id": data["id"],
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
    }


@pytest_asyncio.fixture
async def sample_stock(db_session: AsyncSession) -> Stock:
    import uuid as _uuid
    stock = Stock(
        id=_uuid.uuid4(),
        ticker="AAPL",
        exchange="NASDAQ",
        market=MarketEnum.US,
        name="Apple Inc.",
        name_cn="苹果公司",
        sector="Technology",
        industry="Consumer Electronics",
        description="Apple designs, manufactures and markets smartphones...",
        website="https://www.apple.com",
        employees=164000,
        founded_year=1976,
        current_price=185.50,
        market_cap=2900000000000,
        volume=55000000,
        avg_volume=60000000,
        day_high=187.00,
        day_low=184.20,
        week52_high=199.62,
        week52_low=124.17,
        dividend_yield=0.0052,
        last_updated=datetime.now(timezone.utc),
    )
    db_session.add(stock)
    await db_session.commit()
    await db_session.refresh(stock)
    return stock


@pytest_asyncio.fixture
async def sample_financial_data(db_session: AsyncSession, sample_stock: Stock) -> dict:
    import uuid as _uuid
    from datetime import date as _date

    stmt = FinancialStatement(
        id=_uuid.uuid4(),
        stock_id=sample_stock.id,
        type=StatementType.INCOME,
        period=Period.ANNUAL,
        fiscal_year=2023,
        fiscal_quarter=None,
        report_date=_date(2023, 9, 30),
        currency="USD",
        items={
            "revenue": 383285000000,
            "netIncome": 96995000000,
            "grossProfit": 169148000000,
            "operatingIncome": 114301000000,
        },
    )
    db_session.add(stmt)

    ratio = FinancialRatio(
        id=_uuid.uuid4(),
        stock_id=sample_stock.id,
        date=_date(2023, 9, 30),
        profitability={"roe": 1.72, "roa": 0.28, "gross_margin": 0.44, "net_margin": 0.25},
        growth={"revenue_growth": -0.03, "earnings_growth": -0.02, "eps_growth": 0.01},
        solvency={"debt_to_equity": 1.96, "current_ratio": 1.07, "quick_ratio": 0.99},
        efficiency={"asset_turnover": 1.09},
        valuation={"pe": 30.5, "pb": 47.2, "ps": 7.5, "peg": 2.8},
    )
    db_session.add(ratio)
    await db_session.commit()
    await db_session.refresh(stmt)
    await db_session.refresh(ratio)

    return {
        "stock": sample_stock,
        "statement": stmt,
        "ratio": ratio,
    }
