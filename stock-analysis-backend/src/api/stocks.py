from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.schemas.stock import StockSearchRequest, StockSearchResponse, StockSearchItem, StockOverview
from src.services.stock_service import StockService
from src.services.data_provider import get_data_provider
from src.models.stock import MarketEnum

router = APIRouter()


@router.get("/search", response_model=StockSearchResponse)
async def search_stocks(
    q: str = Query(min_length=1, description="Search query (ticker, company name, or Chinese name)"),
    market: MarketEnum = Query(None, description="Filter by market"),
    limit: int = Query(20, ge=1, le=50, description="Max results"),
    db: AsyncSession = Depends(get_db),
):
    items, total = await StockService.search(db, q, market=market, limit=limit)
    return StockSearchResponse(items=items, total=total, query=q)


@router.get("/{stock_id}", response_model=StockOverview)
async def get_stock_overview(stock_id: UUID, db: AsyncSession = Depends(get_db)):
    overview = await StockService.get_overview(db, stock_id)
    if not overview:
        raise HTTPException(status_code=404, detail="Stock not found")
    return overview


@router.get("/ticker/{ticker}", response_model=StockOverview)
async def get_stock_by_ticker(
    ticker: str,
    exchange: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    stock = await StockService.get_by_ticker(db, ticker, exchange)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    overview = await StockService.get_overview(db, stock.id)
    return overview


@router.post("/fetch/{ticker}")
async def fetch_stock_data(
    ticker: str,
    db: AsyncSession = Depends(get_db),
):
    """Fetch stock data from external provider and store it in the database."""
    provider = get_data_provider("yahoo")
    profile = await provider.get_company_profile(ticker)

    if not profile:
        raise HTTPException(status_code=502, detail=f"Failed to fetch data for {ticker} from Yahoo Finance")

    # Determine market based on exchange
    exchange = profile.get("exchange", "NASDAQ")
    market = MarketEnum.US  # Yahoo Finance primarily covers US markets
    if "HK" in exchange or "HKEX" in exchange:
        market = MarketEnum.HK
    elif any(x in exchange for x in ("SSE", "SZSE", "SHH", "SHZ")):
        market = MarketEnum.CN

    stock = await StockService.upsert_stock(
        db,
        ticker=ticker,
        exchange=exchange,
        market=market,
        name=profile.get("name", ticker),
        sector=profile.get("sector"),
        industry=profile.get("industry"),
        description=profile.get("description"),
        website=profile.get("website"),
        employees=profile.get("employees"),
        current_price=profile.get("current_price"),
        market_cap=profile.get("market_cap"),
        volume=profile.get("volume"),
        avg_volume=profile.get("avg_volume"),
        day_high=profile.get("day_high"),
        day_low=profile.get("day_low"),
        week52_high=profile.get("week52_high"),
        week52_low=profile.get("week52_low"),
        dividend_yield=profile.get("dividend_yield"),
    )

    # Also try to fetch ratios if available
    try:
        ratios_data = await provider.get_financial_ratios(ticker)
        for ratio_entry in ratios_data:
            from datetime import date
            from src.services.financial_service import FinancialService
            await FinancialService.upsert_ratio(
                db,
                stock.id,
                date.fromisoformat(ratio_entry["date"]) if isinstance(ratio_entry["date"], str) else ratio_entry["date"],
                profitability=ratio_entry.get("profitability", {}),
                growth=ratio_entry.get("growth", {}),
                solvency=ratio_entry.get("solvency", {}),
                efficiency=ratio_entry.get("efficiency", {}),
                valuation=ratio_entry.get("valuation", {}),
            )
    except Exception:
        pass  # Ratios are best-effort

    overview = await StockService.get_overview(db, stock.id)
    return overview


@router.get("/markets/{market}/movers", response_model=list[StockSearchItem])
async def get_market_movers(
    market: MarketEnum,
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    stocks = await StockService.get_market_movers(db, market, limit=limit)
    return [
        StockSearchItem(
            id=s.id,
            ticker=s.ticker,
            exchange=s.exchange,
            market=s.market,
            name=s.name,
            name_cn=s.name_cn,
            sector=s.sector,
            industry=s.industry,
            current_price=s.current_price,
            market_cap=s.market_cap,
        )
        for s in stocks
    ]
