from uuid import UUID
from typing import Optional

from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.stock import Stock, MarketEnum
from src.models.financial import FinancialRatio
from src.schemas.stock import StockSearchItem, StockOverview


class StockService:
    @staticmethod
    async def search(
        db: AsyncSession,
        query: str,
        market: Optional[MarketEnum] = None,
        limit: int = 20,
    ) -> tuple[list[StockSearchItem], int]:
        """Search stocks by ticker or name (supports fuzzy matching)."""
        like_pattern = f"%{query}%"

        conditions = [
            Stock.ticker.ilike(like_pattern),
            Stock.name.ilike(like_pattern),
        ]
        # Also search Chinese name if available
        if any(ord(c) > 127 for c in query):
            # Query contains CJK characters - search name_cn too
            conditions.append(Stock.name_cn.ilike(like_pattern))

        base_where = or_(*conditions)
        if market:
            base_where = base_where & (Stock.market == market)

        # Count
        count_result = await db.execute(select(func.count()).select_from(Stock).where(base_where))
        total = count_result.scalar() or 0

        # Fetch results
        result = await db.execute(
            select(Stock).where(base_where).order_by(Stock.market_cap.desc().nullslast()).limit(limit)
        )
        stocks = result.scalars().all()

        items = []
        for s in stocks:
            items.append(StockSearchItem(
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
            ))

        return items, total

    @staticmethod
    async def get_by_id(db: AsyncSession, stock_id: UUID) -> Optional[Stock]:
        result = await db.execute(select(Stock).where(Stock.id == stock_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_ticker(db: AsyncSession, ticker: str, exchange: Optional[str] = None) -> Optional[Stock]:
        conditions = [Stock.ticker == ticker.upper()]
        if exchange:
            conditions.append(Stock.exchange == exchange.upper())
        result = await db.execute(select(Stock).where(*conditions))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_overview(db: AsyncSession, stock_id: UUID) -> Optional[StockOverview]:
        """Get stock overview with snapshot of latest financial ratios."""
        stock = await StockService.get_by_id(db, stock_id)
        if stock is None:
            return None

        # Fetch latest financial ratios for snapshot
        ratio_result = await db.execute(
            select(FinancialRatio)
            .where(FinancialRatio.stock_id == stock_id)
            .order_by(FinancialRatio.date.desc())
            .limit(1)
        )
        latest_ratio = ratio_result.scalar_one_or_none()

        overview = StockOverview(
            id=stock.id,
            ticker=stock.ticker,
            exchange=stock.exchange,
            market=stock.market,
            name=stock.name,
            name_cn=stock.name_cn,
            sector=stock.sector,
            industry=stock.industry,
            description=stock.description,
            website=stock.website,
            employees=stock.employees,
            founded_year=stock.founded_year,
            current_price=stock.current_price,
            market_cap=stock.market_cap,
            volume=stock.volume,
            avg_volume=stock.avg_volume,
            day_high=stock.day_high,
            day_low=stock.day_low,
            week52_high=stock.week52_high,
            week52_low=stock.week52_low,
            dividend_yield=stock.dividend_yield,
            last_updated=stock.last_updated,
        )

        if latest_ratio:
            p = latest_ratio.profitability or {}
            g = latest_ratio.growth or {}
            s = latest_ratio.solvency or {}
            v = latest_ratio.valuation or {}

            overview.pe_ttm = v.get("pe")
            overview.pb = v.get("pb")
            overview.roe = p.get("roe")
            overview.gross_margin = p.get("gross_margin")
            overview.net_margin = p.get("net_margin")
            overview.debt_to_equity = s.get("debt_to_equity")
            overview.current_ratio = s.get("current_ratio")
            overview.revenue_growth = g.get("revenue_growth")
            overview.earnings_growth = g.get("earnings_growth")

        return overview

    @staticmethod
    async def get_market_movers(db: AsyncSession, market: MarketEnum, limit: int = 10) -> list[Stock]:
        """Get most active stocks by volume in a market."""
        result = await db.execute(
            select(Stock)
            .where(Stock.market == market, Stock.volume.isnot(None))
            .order_by(Stock.volume.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    @staticmethod
    async def upsert_stock(db: AsyncSession, ticker: str, exchange: str, market: MarketEnum,
                           name: str, **kwargs) -> Stock:
        """Create or update a stock record (used by data ingestion pipeline)."""
        existing = await StockService.get_by_ticker(db, ticker, exchange)
        if existing:
            for key, value in kwargs.items():
                if hasattr(existing, key) and value is not None:
                    setattr(existing, key, value)
            await db.flush()
            await db.refresh(existing)
            return existing

        stock = Stock(
            ticker=ticker.upper(),
            exchange=exchange.upper(),
            market=market,
            name=name,
            **{k: v for k, v in kwargs.items() if hasattr(Stock, k)},
        )
        db.add(stock)
        await db.flush()
        await db.refresh(stock)
        return stock
