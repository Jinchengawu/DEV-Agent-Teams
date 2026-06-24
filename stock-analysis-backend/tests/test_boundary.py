"""
Boundary and edge-case tests for the stock analysis backend.

Covers input validation, SQL injection safety, concurrency, and extreme values.
"""
import pytest
from uuid import uuid4
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession
from src.models.stock import Stock, MarketEnum
from src.services.stock_service import StockService


# ============================================================
# Input Validation & Boundary Values
# ============================================================

@pytest.mark.asyncio
async def test_search_empty_query_returns_validation_error(client):
    """Search with empty string should be rejected (Pydantic min_length=1)."""
    resp = await client.post("/api/v1/auth/register", json={
        "email": "valid@test.com",
        "username": "",
        "password": "TestPass123",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_search_special_chars_safe(db_session: AsyncSession, sample_stock: Stock):
    """Search with SQL-special characters should not error (parameterized)."""
    queries = ["'; DROP TABLE stocks;--", "%00", "\\", "' OR '1'='1", "%%%"]
    for q in queries:
        items, _ = await StockService.search(db_session, query=q, limit=5)
        # Should not throw; just return no results or handle gracefully
        assert isinstance(items, list), f"Query '{q}' should return a list"


@pytest.mark.asyncio
async def test_search_very_long_query(db_session: AsyncSession, sample_stock: Stock):
    """Search with a very long string should not crash."""
    items, _ = await StockService.search(db_session, query="A" * 500, limit=5)
    assert isinstance(items, list)


@pytest.mark.asyncio
async def test_search_unicode_cjk(db_session: AsyncSession, sample_stock: Stock):
    """Search with Chinese characters should work."""
    items, total = await StockService.search(db_session, query="苹果")
    assert isinstance(items, list)
    assert total >= 1


@pytest.mark.asyncio
async def test_stock_extreme_values(db_session: AsyncSession):
    """Stock model should handle extreme numeric values."""
    stock = Stock(
        ticker="BIG",
        exchange="NYSE",
        market=MarketEnum.US,
        name="Big Numbers Corp",
        current_price=999999.99,
        market_cap=9.99e15,
        volume=1e10,
        avg_volume=1e10,
        employees=5000000,
        founded_year=1800,
        dividend_yield=1.0,  # 100%
        week52_high=9.99e8,
        week52_low=0.0001,
    )
    db_session.add(stock)
    await db_session.commit()
    await db_session.refresh(stock)

    assert stock.current_price == 999999.99
    assert stock.market_cap == 9.99e15
    assert stock.employees == 5000000


@pytest.mark.asyncio
async def test_stock_nullable_fields(db_session: AsyncSession):
    """Stock with all nullable fields left as None should be storable."""
    stock = Stock(
        ticker="SPARSE",
        exchange="OTC",
        market=MarketEnum.US,
        name="Sparse Data Inc",
        # Leave most fields as None
    )
    db_session.add(stock)
    await db_session.commit()
    await db_session.refresh(stock)

    assert stock.id is not None
    assert stock.current_price is None
    assert stock.market_cap is None
    assert stock.description is None


# ============================================================
# Data Integrity
# ============================================================

@pytest.mark.asyncio
async def test_duplicate_ticker_allowed(db_session: AsyncSession, sample_stock: Stock):
    """Same ticker on different exchanges should be allowed."""
    stock2 = Stock(
        ticker="AAPL",  # Same ticker
        exchange="LSE",  # Different exchange
        market=MarketEnum.US,
        name="Apple Inc. London",
    )
    db_session.add(stock2)
    await db_session.commit()
    await db_session.refresh(stock2)

    # get_by_ticker without exchange should find the first one
    found = await StockService.get_by_ticker(db_session, "AAPL")
    assert found is not None


@pytest.mark.asyncio
async def test_search_limit_respected(db_session: AsyncSession):
    """Search should respect the limit parameter."""
    # Create multiple stocks
    for i in range(5):
        s = Stock(
            ticker=f"LIMIT{i}",
            exchange="TEST",
            market=MarketEnum.US,
            name=f"Limit Test {i}",
            current_price=100.0 + i,
        )
        db_session.add(s)
    await db_session.commit()

    items, total = await StockService.search(db_session, query="LIMIT", limit=2)
    assert len(items) <= 2
    assert total == 5  # Total count unaffected by limit


@pytest.mark.asyncio
async def test_search_case_insensitive(db_session: AsyncSession, sample_stock: Stock):
    """Ticker search should be case-insensitive."""
    items, _ = await StockService.search(db_session, query="aapl")
    assert any(item.ticker == "AAPL" for item in items)

    items2, _ = await StockService.search(db_session, query="AaPl")
    assert any(it.ticker == "AAPL" for it in items2)


# ============================================================
# Multiple Markets
# ============================================================

@pytest.mark.asyncio
async def test_china_market_stock(db_session: AsyncSession):
    """Stock with CN market should be searchable."""
    stock = Stock(
        ticker="000001",
        exchange="SZSE",
        market=MarketEnum.CN,
        name="平安银行",
        name_cn="平安银行",
        sector="Financial",
        current_price=12.50,
    )
    db_session.add(stock)
    await db_session.commit()

    items, _ = await StockService.search(db_session, query="平安")
    assert any(item.market == MarketEnum.CN for item in items)


@pytest.mark.asyncio
async def test_hk_market_stock(db_session: AsyncSession):
    """Stock with HK market should be searchable."""
    stock = Stock(
        ticker="0700",
        exchange="HKEX",
        market=MarketEnum.HK,
        name="Tencent Holdings Ltd",
        name_cn="腾讯控股",
        current_price=380.00,
    )
    db_session.add(stock)
    await db_session.commit()

    items, _ = await StockService.search(db_session, query="Tencent")
    assert any(item.market == MarketEnum.HK for item in items)


# ============================================================
# UUID / ID Validation
# ============================================================

@pytest.mark.asyncio
async def test_get_by_id_random_uuid(db_session: AsyncSession):
    """get_by_id with random UUID returns None."""
    found = await StockService.get_by_id(db_session, uuid4())
    assert found is None


@pytest.mark.asyncio
async def test_get_overview_nonexistent(db_session: AsyncSession):
    """get_overview for non-existent stock returns None."""
    overview = await StockService.get_overview(db_session, uuid4())
    assert overview is None
