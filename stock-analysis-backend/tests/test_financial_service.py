"""
Integration tests for FinancialService — statements, ratios, trends.
"""
import pytest
from uuid import uuid4
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession
from src.models.stock import Stock
from src.models.financial import StatementType, Period
from src.services.financial_service import FinancialService


@pytest.mark.asyncio
async def test_upsert_statement_create(db_session: AsyncSession, sample_stock: Stock):
    """Upsert should create a new financial statement."""
    stmt = await FinancialService.upsert_statement(
        db_session,
        stock_id=sample_stock.id,
        statement_type=StatementType.INCOME,
        period=Period.ANNUAL,
        fiscal_year=2024,
        fiscal_quarter=None,
        report_date=date(2024, 9, 30),
        currency="USD",
        items={"revenue": 400000000000, "netIncome": 100000000000},
    )
    assert stmt.id is not None
    assert stmt.fiscal_year == 2024
    assert stmt.items["revenue"] == 400000000000


@pytest.mark.asyncio
async def test_upsert_statement_update(db_session: AsyncSession, sample_financial_data: dict):
    """Upsert should update existing financial statement."""
    existing = sample_financial_data["statement"]
    updated = await FinancialService.upsert_statement(
        db_session,
        stock_id=existing.stock_id,
        statement_type=existing.type,
        period=existing.period,
        fiscal_year=existing.fiscal_year,
        fiscal_quarter=existing.fiscal_quarter,
        report_date=existing.report_date,
        currency=existing.currency,
        items={"revenue": 500000000000},  # Updated value
    )
    assert updated.id == existing.id
    assert updated.items["revenue"] == 500000000000


@pytest.mark.asyncio
async def test_get_statements(db_session: AsyncSession, sample_financial_data: dict):
    """get_statements should return all statements for a stock."""
    stock = sample_financial_data["stock"]
    stmts, total = await FinancialService.get_statements(db_session, stock.id)
    assert total >= 1
    assert len(stmts) >= 1


@pytest.mark.asyncio
async def test_get_statements_filtered(db_session: AsyncSession, sample_financial_data: dict):
    """get_statements should respect type and period filters."""
    stock = sample_financial_data["stock"]
    stmts, _ = await FinancialService.get_statements(
        db_session, stock.id, statement_type=StatementType.INCOME, period=Period.ANNUAL,
    )
    assert len(stmts) >= 1
    assert all(s.type == StatementType.INCOME for s in stmts)


@pytest.mark.asyncio
async def test_get_statements_no_results(db_session: AsyncSession, sample_financial_data: dict):
    """get_statements with non-matching filters should return empty."""
    stock = sample_financial_data["stock"]
    stmts, total = await FinancialService.get_statements(
        db_session, stock.id, statement_type=StatementType.BALANCE_SHEET,
    )
    assert total == 0


@pytest.mark.asyncio
async def test_get_ratios(db_session: AsyncSession, sample_financial_data: dict):
    """get_ratios should return ratio history."""
    stock = sample_financial_data["stock"]
    ratios, total = await FinancialService.get_ratios(db_session, stock.id)
    assert total >= 1
    assert len(ratios) >= 1
    r = ratios[0]
    assert r.profitability is not None
    assert r.valuation is not None


@pytest.mark.asyncio
async def test_get_ratios_empty(db_session: AsyncSession, sample_stock: Stock):
    """get_ratios for a stock with no ratios should return empty."""
    ratios, total = await FinancialService.get_ratios(db_session, sample_stock.id)
    assert total == 0


@pytest.mark.asyncio
async def test_upsert_ratio_create(db_session: AsyncSession, sample_stock: Stock):
    """Upsert ratio should create a new ratio record."""
    ratio = await FinancialService.upsert_ratio(
        db_session,
        stock_id=sample_stock.id,
        date_val=date(2024, 6, 30),
        profitability={"roe": 0.15},
        growth={},
        solvency={},
        efficiency={},
        valuation={"pe": 25.0},
    )
    assert ratio.id is not None
    assert ratio.profitability["roe"] == 0.15


@pytest.mark.asyncio
async def test_upsert_ratio_update(db_session: AsyncSession, sample_financial_data: dict):
    """Upsert ratio should update existing ratio."""
    existing = sample_financial_data["ratio"]
    updated = await FinancialService.upsert_ratio(
        db_session,
        stock_id=existing.stock_id,
        date_val=existing.date,
        profitability={"roe": 2.0},  # Updated
        growth=existing.growth,
        solvency=existing.solvency,
        efficiency=existing.efficiency,
        valuation=existing.valuation,
    )
    assert updated.id == existing.id
    assert updated.profitability["roe"] == 2.0


@pytest.mark.asyncio
async def test_get_ratio_trend(db_session: AsyncSession, sample_financial_data: dict):
    """get_ratio_trend should extract a single metric as a time series."""
    stock = sample_financial_data["stock"]
    trend = await FinancialService.get_ratio_trend(db_session, stock.id, "profitability.roe")
    assert len(trend) >= 1
    # Each entry is (date, value)
    assert isinstance(trend[0][0], date)
    assert isinstance(trend[0][1], float)


@pytest.mark.asyncio
async def test_get_ratio_trend_invalid_path(db_session: AsyncSession, sample_financial_data: dict):
    """get_ratio_trend with unknown metric path should return empty."""
    stock = sample_financial_data["stock"]
    trend = await FinancialService.get_ratio_trend(db_session, stock.id, "profitability.nonexistent")
    assert trend == []


@pytest.mark.asyncio
async def test_financial_data_consistency(db_session: AsyncSession, sample_financial_data: dict):
    """Verify financial statement and ratio are linked to the same stock."""
    stmt = sample_financial_data["statement"]
    ratio = sample_financial_data["ratio"]
    stock = sample_financial_data["stock"]

    assert stmt.stock_id == stock.id
    assert ratio.stock_id == stock.id

    # Verify statement items are accessible
    assert "revenue" in stmt.items
    assert "netIncome" in stmt.items

    # Verify ratio structure
    assert "roe" in ratio.profitability
    assert "pe" in ratio.valuation
    assert "debt_to_equity" in ratio.solvency
