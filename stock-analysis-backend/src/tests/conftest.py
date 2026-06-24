import asyncio
import uuid
from datetime import date, datetime, timezone
from typing import AsyncGenerator

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

# Use SQLite for tests (no PostgreSQL needed locally)
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

# Override settings BEFORE importing app modules
from src import config
config.settings.database_url = TEST_DATABASE_URL
config.settings.jwt_secret_key = "test-secret-key"
config.settings.jwt_algorithm = "HS256"
config.settings.llm_api_key = "test-key"
config.settings.debug = False

from src.database import Base, async_session as original_session, get_db
from src.main import app

# Test engine
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
test_sessionmaker = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True)
async def setup_database():
    """Create all tables before each test module."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide a clean database session for each test."""
    async with test_sessionmaker() as session:
        yield session
        await session.rollback()


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Provide an HTTP test client with overridden database dependency."""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
def sample_user_data():
    return {
        "email": "test@example.com",
        "username": "testuser",
        "password": "testpassword123",
        "display_name": "Test User",
    }


@pytest.fixture
async def auth_token(client: AsyncClient, sample_user_data: dict) -> str:
    """Register a user and return an access token."""
    # Register
    await client.post("/api/v1/auth/register", json={
        "email": sample_user_data["email"],
        "username": sample_user_data["username"],
        "password": sample_user_data["password"],
    })
    # Login
    response = await client.post("/api/v1/auth/login", json={
        "username": sample_user_data["username"],
        "password": sample_user_data["password"],
    })
    data = response.json()
    return data["access_token"]


@pytest.fixture
async def sample_stock(db_session: AsyncSession):
    """Create a sample stock in the database."""
    from src.models.stock import Stock, MarketEnum
    stock = Stock(
        id=uuid.uuid4(),
        ticker="AAPL",
        exchange="NASDAQ",
        market=MarketEnum.US,
        name="Apple Inc.",
        name_cn="苹果公司",
        sector="Technology",
        industry="Consumer Electronics",
        description="Apple Inc. designs, manufactures, and markets smartphones...",
        website="https://www.apple.com",
        employees=164000,
        founded_year=1976,
        current_price=175.50,
        market_cap=2750000000000,
        volume=55000000,
        avg_volume=60000000,
        day_high=177.20,
        day_low=174.80,
        week52_high=199.62,
        week52_low=164.08,
        dividend_yield=0.0055,
        last_updated=datetime.now(timezone.utc),
    )
    db_session.add(stock)
    await db_session.commit()
    await db_session.refresh(stock)
    return stock


@pytest.fixture
async def sample_ratios(db_session: AsyncSession, sample_stock):
    """Create sample financial ratios for a stock."""
    from src.models.financial import FinancialRatio
    ratio = FinancialRatio(
        id=uuid.uuid4(),
        stock_id=sample_stock.id,
        date=date.today(),
        profitability={
            "roe": 0.45,
            "roa": 0.28,
            "gross_margin": 0.44,
            "net_margin": 0.25,
            "operating_margin": 0.30,
        },
        growth={
            "revenue_growth": 0.15,
            "earnings_growth": 0.12,
            "fcf_growth": 0.10,
            "eps_growth": 0.13,
        },
        solvency={
            "debt_to_equity": 1.2,
            "current_ratio": 1.5,
            "quick_ratio": 1.2,
            "interest_coverage": 20.0,
        },
        efficiency={
            "inventory_turnover": 8.5,
            "receivable_turnover": 12.0,
            "asset_turnover": 1.1,
        },
        valuation={
            "pe": 28.5,
            "pb": 9.2,
            "ps": 8.1,
            "ev_ebitda": 22.0,
            "peg": 2.3,
        },
    )
    db_session.add(ratio)
    await db_session.commit()
    await db_session.refresh(ratio)
    return ratio
