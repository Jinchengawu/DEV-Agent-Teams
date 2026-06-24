from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID
from typing import Optional
from src.models.stock import MarketEnum


class StockSearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=200, description="Stock ticker, company name, or natural language query")


class StockSearchItem(BaseModel):
    id: UUID
    ticker: str
    exchange: str
    market: MarketEnum
    name: str
    name_cn: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    current_price: Optional[float] = None
    market_cap: Optional[float] = None
    day_change_percent: Optional[float] = None

    model_config = {"from_attributes": True}


class StockSearchResponse(BaseModel):
    items: list[StockSearchItem]
    total: int
    query: str


class StockOverview(BaseModel):
    id: UUID
    ticker: str
    exchange: str
    market: MarketEnum
    name: str
    name_cn: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    employees: Optional[int] = None
    founded_year: Optional[int] = None
    current_price: Optional[float] = None
    market_cap: Optional[float] = None
    volume: Optional[float] = None
    avg_volume: Optional[float] = None
    day_high: Optional[float] = None
    day_low: Optional[float] = None
    week52_high: Optional[float] = None
    week52_low: Optional[float] = None
    dividend_yield: Optional[float] = None
    last_updated: Optional[datetime] = None

    # Key financial ratios snapshot
    pe_ttm: Optional[float] = None
    pb: Optional[float] = None
    roe: Optional[float] = None
    gross_margin: Optional[float] = None
    net_margin: Optional[float] = None
    debt_to_equity: Optional[float] = None
    current_ratio: Optional[float] = None
    revenue_growth: Optional[float] = None
    earnings_growth: Optional[float] = None

    model_config = {"from_attributes": True}
