"""Tests for stock endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_search_stocks_by_ticker(client: AsyncClient, sample_stock):
    response = await client.get("/api/v1/stocks/search", params={"q": "AAPL"})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    items = data["items"]
    assert any(s["ticker"] == "AAPL" for s in items)


@pytest.mark.asyncio
async def test_search_stocks_by_name(client: AsyncClient, sample_stock):
    response = await client.get("/api/v1/stocks/search", params={"q": "Apple"})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_search_stocks_by_cn_name(client: AsyncClient, sample_stock):
    response = await client.get("/api/v1/stocks/search", params={"q": "苹果"})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    items = data["items"]
    assert any(s["ticker"] == "AAPL" for s in items)


@pytest.mark.asyncio
async def test_search_no_results(client: AsyncClient):
    response = await client.get("/api/v1/stocks/search", params={"q": "ZZZZNONEXISTENT"})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert len(data["items"]) == 0


@pytest.mark.asyncio
async def test_get_stock_overview(client: AsyncClient, sample_stock):
    response = await client.get(f"/api/v1/stocks/{sample_stock.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["ticker"] == "AAPL"
    assert data["name"] == "Apple Inc."
    assert data["current_price"] == 175.50
    assert data["market_cap"] == 2750000000000


@pytest.mark.asyncio
async def test_get_stock_not_found(client: AsyncClient):
    import uuid
    response = await client.get(f"/api/v1/stocks/{uuid.uuid4()}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_stock_by_ticker(client: AsyncClient, sample_stock):
    response = await client.get("/api/v1/stocks/ticker/AAPL")
    assert response.status_code == 200
    data = response.json()
    assert data["ticker"] == "AAPL"


@pytest.mark.asyncio
async def test_get_stock_overview_with_ratios(client: AsyncClient, sample_stock, sample_ratios):
    """Stock overview should include financial ratio snapshots."""
    response = await client.get(f"/api/v1/stocks/{sample_stock.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["pe_ttm"] == 28.5
    assert data["roe"] == 0.45
    assert data["revenue_growth"] == 0.15
    assert data["debt_to_equity"] == 1.2


@pytest.mark.asyncio
async def test_get_market_movers(client: AsyncClient, sample_stock):
    response = await client.get("/api/v1/stocks/markets/US/movers", params={"limit": 5})
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert any(s["ticker"] == "AAPL" for s in data)
