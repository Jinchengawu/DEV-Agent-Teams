from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.schemas.financial import (
    FinancialStatementListResponse,
    FinancialRatioListResponse,
    FinancialRatioTrendResponse,
    FinancialRatioTrendPoint,
)
from src.models.financial import StatementType, Period
from src.services.financial_service import FinancialService

router = APIRouter()


@router.get("/statements/{stock_id}", response_model=FinancialStatementListResponse)
async def get_financial_statements(
    stock_id: UUID,
    type: StatementType = Query(None, description="Filter by statement type"),
    period: Period = Query(None, description="Filter by period (annual/quarterly)"),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    statements, total = await FinancialService.get_statements(
        db, stock_id, statement_type=type, period=period, limit=limit
    )
    return FinancialStatementListResponse(statements=list(statements), total=total)


@router.get("/ratios/{stock_id}", response_model=FinancialRatioListResponse)
async def get_financial_ratios(
    stock_id: UUID,
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    ratios, total = await FinancialService.get_ratios(db, stock_id, limit=limit)
    return FinancialRatioListResponse(ratios=list(ratios), total=total)


@router.get("/ratios/{stock_id}/trend", response_model=FinancialRatioTrendResponse)
async def get_ratio_trend(
    stock_id: UUID,
    metric: str = Query(..., description="Metric path, e.g. 'profitability.roe', 'valuation.pe', 'growth.revenue_growth'"),
    years: int = Query(5, ge=1, le=10),
    db: AsyncSession = Depends(get_db),
):
    valid_prefixes = ["profitability", "growth", "solvency", "efficiency", "valuation"]
    prefix = metric.split(".")[0]
    if prefix not in valid_prefixes:
        raise HTTPException(status_code=400, detail=f"Invalid metric prefix. Must be one of: {valid_prefixes}")

    trend = await FinancialService.get_ratio_trend(db, stock_id, metric, years=years)

    if not trend:
        return FinancialRatioTrendResponse(metric=metric, data=[])

    return FinancialRatioTrendResponse(
        metric=metric,
        data=[FinancialRatioTrendPoint(date=date_val, value=value) for date_val, value in trend],
    )
