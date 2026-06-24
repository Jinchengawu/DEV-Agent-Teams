from pydantic import BaseModel
from datetime import date, datetime
from uuid import UUID
from typing import Optional, Any
from src.models.financial import StatementType, Period


class FinancialStatementItem(BaseModel):
    id: UUID
    stock_id: UUID
    type: StatementType
    period: Period
    fiscal_year: int
    fiscal_quarter: Optional[int] = None
    report_date: date
    currency: str
    items: dict[str, Any]

    model_config = {"from_attributes": True}


class FinancialStatementListResponse(BaseModel):
    statements: list[FinancialStatementItem]
    total: int


class RatioGroup(BaseModel):
    roe: Optional[float] = None
    roa: Optional[float] = None
    gross_margin: Optional[float] = None
    net_margin: Optional[float] = None
    operating_margin: Optional[float] = None


class GrowthGroup(BaseModel):
    revenue_growth: Optional[float] = None
    earnings_growth: Optional[float] = None
    fcf_growth: Optional[float] = None
    eps_growth: Optional[float] = None


class SolvencyGroup(BaseModel):
    debt_to_equity: Optional[float] = None
    current_ratio: Optional[float] = None
    quick_ratio: Optional[float] = None
    interest_coverage: Optional[float] = None


class EfficiencyGroup(BaseModel):
    inventory_turnover: Optional[float] = None
    receivable_turnover: Optional[float] = None
    asset_turnover: Optional[float] = None


class ValuationGroup(BaseModel):
    pe: Optional[float] = None
    pb: Optional[float] = None
    ps: Optional[float] = None
    ev_ebitda: Optional[float] = None
    peg: Optional[float] = None


class FinancialRatioItem(BaseModel):
    id: UUID
    stock_id: UUID
    date: date
    profitability: RatioGroup
    growth: GrowthGroup
    solvency: SolvencyGroup
    efficiency: EfficiencyGroup
    valuation: ValuationGroup

    model_config = {"from_attributes": True}


class FinancialRatioListResponse(BaseModel):
    ratios: list[FinancialRatioItem]
    total: int


class FinancialRatioTrendPoint(BaseModel):
    date: date
    value: float


class FinancialRatioTrendResponse(BaseModel):
    metric: str  # e.g. "roe", "pe", "revenue_growth"
    data: list[FinancialRatioTrendPoint]
    industry_avg: Optional[float] = None
