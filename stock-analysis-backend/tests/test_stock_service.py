"""
Integration tests for StockService and database models.

Tests the service layer directly against the test database — no HTTP layer.
"""
import pytest
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession
from src.models.stock import Stock, MarketEnum
from src.services.stock_service import StockService


@pytest.mark.asyncio
async def test_create_stock(db_session: AsyncSession):
    """Insert a stock record directly."""
    stock = Stock(
        ticker="TSLA",
        exchange="NASDAQ",
        market=MarketEnum.US,
        name="Tesla Inc.",
        current_price=245.30,
        market_cap=780000000000,
    )
    db_session.add(stock)
    await db_session.commit()
    await db_session.refresh(stock)

    assert stock.id is not None
    assert stock.ticker == "TSLA"
    assert stock.market == MarketEnum.US


@pytest.mark.asyncio
async def test_upsert_stock_new(db_session: AsyncSession):
    """Upsert should create a new stock when it doesn't exist."""
    stock = await StockService.upsert_stock(
        db_session,
        ticker="NVDA",
        exchange="NASDAQ",
        market=MarketEnum.US,
        name="NVIDIA Corporation",
        current_price=950.00,
        market_cap=2350000000000,
    )
    assert stock.ticker == "NVDA"
    assert stock.current_price == 950.00


@pytest.mark.asyncio
async def test_upsert_stock_update(db_session: AsyncSession, sample_stock: Stock):
    """Upsert should update an existing stock."""
    updated = await StockService.upsert_stock(
        db_session,
        ticker=sample_stock.ticker,
        exchange=sample_stock.exchange,
        market=sample_stock.market,
        name=sample_stock.name,
        current_price=200.00,  # Updated price
    )
    assert updated.id == sample_stock.id
    assert updated.current_price == 200.00


@pytest.mark.asyncio
async def test_search_by_ticker(db_session: AsyncSession, sample_stock: Stock):
    """Search should find stock by ticker."""
    items, total = await StockService.search(db_session, query="AAPL")
    assert total >= 1
    tickers = [item.ticker for item in items]
    assert "AAPL" in tickers


@pytest.mark.asyncio
async def test_search_by_name(db_session: AsyncSession, sample_stock: Stock):
    """Search should find stock by company name."""
    items, total = await StockService.search(db_session, query="Apple")
    assert total >= 1
    names = [item.name for item in items]
    assert any("Apple" in name for name in names)


@pytest.mark.asyncio
async def test_search_by_cn_name(db_session: AsyncSession, sample_stock: Stock):
    """Search should find stock by Chinese name."""
    items, total = await StockService.search(db_session, query="苹果")
    assert total >= 1


@pytest.mark.asyncio
async def test_search_no_results(db_session: AsyncSession, sample_stock: Stock):
    """Search with non-matching query should return zero results."""
    items, total = await StockService.search(db_session, query="ZZZZNOMATCH")
    assert total == 0
    assert len(items) == 0


@pytest.mark.asyncio
async def test_get_by_id(db_session: AsyncSession, sample_stock: Stock):
    """get_by_id should return the correct stock."""
    found = await StockService.get_by_id(db_session, sample_stock.id)
    assert found is not None
    assert found.ticker == sample_stock.ticker


@pytest.mark.asyncio
async def test_get_by_id_not_found(db_session: AsyncSession):
    """get_by_id should return None for non-existent stock."""
    found = await StockService.get_by_id(db_session, uuid4())
    assert found is None


@pytest.mark.asyncio
async def test_get_by_ticker(db_session: AsyncSession, sample_stock: Stock):
    """get_by_ticker should find stock by ticker."""
    found = await StockService.get_by_ticker(db_session, "aapl")
    assert found is not None
    assert found.ticker == "AAPL"


@pytest.mark.asyncio
async def test_get_overview(db_session: AsyncSession, sample_financial_data: dict):
    """get_overview returns stock with financial snapshot."""
    stock = sample_financial_data["stock"]
    overview = await StockService.get_overview(db_session, stock.id)
    assert overview is not None
    assert overview.ticker == stock.ticker
    assert overview.pe_ttm is not None
    assert overview.roe is not None


@pytest.mark.asyncio
async def test_get_overview_no_ratios(db_session: AsyncSession, sample_stock: Stock):
    """get_overview without financial ratios should still return overview."""
    overview = await StockService.get_overview(db_session, sample_stock.id)
    assert overview is not None
    assert overview.ticker == sample_stock.ticker
    # Ratios should be None since no financial data
    assert overview.pe_ttm is None


@pytest.mark.asyncio
async def test_market_movers(db_session: AsyncSession, sample_stock: Stock):
    """get_market_movers should return stocks sorted by volume."""
    movers = await StockService.get_market_movers(db_session, MarketEnum.US, limit=10)
    assert len(movers) >= 1
    # sample_stock should be among the results
    tickers = [s.ticker for s in movers]
    assert sample_stock.ticker in tickers


@pytest.mark.asyncio
async def test_search_with_market_filter(db_session: AsyncSession, sample_stock: Stock):
    """Search should respect market filter."""
    items, _ = await StockService.search(db_session, query="AAPL", market=MarketEnum.US)
    assert len(items) >= 1

    # Filter with non-matching market should return 0
    items2, _ = await StockService.search(db_session, query="AAPL", market=MarketEnum.CN)
    assert len(items2) == 0
