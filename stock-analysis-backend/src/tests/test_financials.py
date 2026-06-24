"""Tests for financial endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_financial_ratios(client: AsyncClient, sample_stock, sample_ratios):
    response = await client.get(f"/api/v1/financials/ratios/{sample_stock.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    ratio = data["ratios"][0]
    assert ratio["profitability"]["roe"] == 0.45


@pytest.mark.asyncio
async def test_get_ratio_trend(client: AsyncClient, sample_stock, sample_ratios):
    response = await client.get(
        f"/api/v1/financials/ratios/{sample_stock.id}/trend",
        params={"metric": "profitability.roe"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["metric"] == "profitability.roe"
    assert len(data["data"]) > 0
    point = data["data"][0]
    assert "date" in point
    assert "value" in point
    assert point["value"] == 0.45


@pytest.mark.asyncio
async def test_get_ratio_trend_invalid_metric(client: AsyncClient, sample_stock):
    response = await client.get(
        f"/api/v1/financials/ratios/{sample_stock.id}/trend",
        params={"metric": "invalid.wrong"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_get_financial_statements_empty(client: AsyncClient, sample_stock):
    """Statements should return empty list when no data loaded."""
    response = await client.get(f"/api/v1/financials/statements/{sample_stock.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_get_financial_statements_with_filter(client: AsyncClient, sample_stock):
    """Filtering by statement type should work."""
    response = await client.get(
        f"/api/v1/financials/statements/{sample_stock.id}",
        params={"type": "income", "period": "annual"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0  # No data loaded, but filter respected
