from uuid import UUID
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.financial import FinancialStatement, StatementType, Period, FinancialRatio


class FinancialService:
    @staticmethod
    async def get_statements(
        db: AsyncSession,
        stock_id: UUID,
        statement_type: Optional[StatementType] = None,
        period: Optional[Period] = None,
        years: int = 5,
        limit: int = 20,
    ) -> tuple[list[FinancialStatement], int]:
        """Get financial statements for a stock with filters."""
        conditions = [FinancialStatement.stock_id == stock_id]

        if statement_type:
            conditions.append(FinancialStatement.type == statement_type)
        if period:
            conditions.append(FinancialStatement.period == period)

        base_where = conditions[0]
        for cond in conditions[1:]:
            base_where = base_where & cond

        count_result = await db.execute(
            select(func.count()).select_from(FinancialStatement).where(base_where)
        )
        total = count_result.scalar() or 0

        result = await db.execute(
            select(FinancialStatement)
            .where(base_where)
            .order_by(FinancialStatement.fiscal_year.desc(), FinancialStatement.fiscal_quarter.desc())
            .limit(limit)
        )
        return list(result.scalars().all()), total

    @staticmethod
    async def get_ratios(
        db: AsyncSession,
        stock_id: UUID,
        limit: int = 20,
    ) -> tuple[list[FinancialRatio], int]:
        """Get financial ratios history for a stock."""
        base_where = FinancialRatio.stock_id == stock_id

        count_result = await db.execute(
            select(func.count()).select_from(FinancialRatio).where(base_where)
        )
        total = count_result.scalar() or 0

        result = await db.execute(
            select(FinancialRatio)
            .where(base_where)
            .order_by(FinancialRatio.date.desc())
            .limit(limit)
        )
        return list(result.scalars().all()), total

    @staticmethod
    async def get_ratio_trend(
        db: AsyncSession,
        stock_id: UUID,
        metric_path: str,
        years: int = 5,
    ) -> list[tuple]:
        """
        Get a single metric trend over time.
        metric_path examples: 'profitability.roe', 'valuation.pe', 'growth.revenue_growth'
        """
        from datetime import date as _date, timedelta
        cutoff = _date.today() - timedelta(days=years * 365)

        result = await db.execute(
            select(FinancialRatio.date, FinancialRatio.profitability, FinancialRatio.growth,
                   FinancialRatio.solvency, FinancialRatio.efficiency, FinancialRatio.valuation)
            .where(FinancialRatio.stock_id == stock_id, FinancialRatio.date >= cutoff)
            .order_by(FinancialRatio.date.asc())
        )
        rows = result.all()

        trend = []
        parts = metric_path.split(".")  # e.g. ["profitability", "roe"]
        for row in rows:
            date_val = row[0]
            group = None
            if parts[0] == "profitability":
                group = row[1]
            elif parts[0] == "growth":
                group = row[2]
            elif parts[0] == "solvency":
                group = row[3]
            elif parts[0] == "efficiency":
                group = row[4]
            elif parts[0] == "valuation":
                group = row[5]

            if group and len(parts) > 1 and parts[1] in group:
                value = group[parts[1]]
                if value is not None:
                    trend.append((date_val, float(value)))

        return trend

    @staticmethod
    async def upsert_statement(
        db: AsyncSession,
        stock_id: UUID,
        statement_type: StatementType,
        period: Period,
        fiscal_year: int,
        fiscal_quarter: Optional[int],
        report_date,
        currency: str,
        items: dict,
    ) -> FinancialStatement:
        """Insert or update a financial statement (idempotent)."""
        conditions = [
            FinancialStatement.stock_id == stock_id,
            FinancialStatement.type == statement_type,
            FinancialStatement.period == period,
            FinancialStatement.fiscal_year == fiscal_year,
        ]
        if fiscal_quarter:
            conditions.append(FinancialStatement.fiscal_quarter == fiscal_quarter)

        base_where = conditions[0]
        for cond in conditions[1:]:
            base_where = base_where & cond

        result = await db.execute(select(FinancialStatement).where(base_where))
        existing = result.scalar_one_or_none()

        if existing:
            existing.items = items
            existing.report_date = report_date
            existing.currency = currency
            await db.flush()
            await db.refresh(existing)
            return existing

        stmt = FinancialStatement(
            stock_id=stock_id,
            type=statement_type,
            period=period,
            fiscal_year=fiscal_year,
            fiscal_quarter=fiscal_quarter,
            report_date=report_date,
            currency=currency,
            items=items,
        )
        db.add(stmt)
        await db.flush()
        await db.refresh(stmt)
        return stmt

    @staticmethod
    async def upsert_ratio(
        db: AsyncSession,
        stock_id: UUID,
        date_val,
        profitability: dict,
        growth: dict,
        solvency: dict,
        efficiency: dict,
        valuation: dict,
    ) -> FinancialRatio:
        """Insert or update financial ratios for a date (idempotent)."""
        result = await db.execute(
            select(FinancialRatio).where(
                FinancialRatio.stock_id == stock_id,
                FinancialRatio.date == date_val,
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            existing.profitability = profitability
            existing.growth = growth
            existing.solvency = solvency
            existing.efficiency = efficiency
            existing.valuation = valuation
            await db.flush()
            await db.refresh(existing)
            return existing

        ratio = FinancialRatio(
            stock_id=stock_id,
            date=date_val,
            profitability=profitability,
            growth=growth,
            solvency=solvency,
            efficiency=efficiency,
            valuation=valuation,
        )
        db.add(ratio)
        await db.flush()
        await db.refresh(ratio)
        return ratio
