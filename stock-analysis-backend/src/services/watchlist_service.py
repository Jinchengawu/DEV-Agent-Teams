from uuid import UUID
from typing import Optional

from sqlalchemy import select, func, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.stock import Stock
from src.models.watchlist import Watchlist, Alert, AnalysisNote
from src.schemas.stock import StockSearchItem


class WatchlistService:
    @staticmethod
    async def create_watchlist(db: AsyncSession, user_id: UUID, name: str,
                                stock_ids: list[UUID] = None) -> Watchlist:
        watchlist = Watchlist(
            user_id=user_id,
            name=name,
            stock_ids=stock_ids or [],
        )
        db.add(watchlist)
        await db.flush()
        await db.refresh(watchlist)
        return watchlist

    @staticmethod
    async def get_user_watchlists(db: AsyncSession, user_id: UUID) -> tuple[list[Watchlist], int]:
        result = await db.execute(
            select(Watchlist).where(Watchlist.user_id == user_id).order_by(Watchlist.created_at.desc())
        )
        watchlists = list(result.scalars().all())
        total = len(watchlists)
        return watchlists, total

    @staticmethod
    async def get_watchlist(db: AsyncSession, watchlist_id: UUID, user_id: UUID) -> Optional[Watchlist]:
        result = await db.execute(
            select(Watchlist).where(Watchlist.id == watchlist_id, Watchlist.user_id == user_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def update_watchlist(db: AsyncSession, watchlist_id: UUID, user_id: UUID,
                                name: Optional[str] = None,
                                stock_ids: Optional[list[UUID]] = None) -> Optional[Watchlist]:
        watchlist = await WatchlistService.get_watchlist(db, watchlist_id, user_id)
        if not watchlist:
            return None
        if name is not None:
            watchlist.name = name
        if stock_ids is not None:
            watchlist.stock_ids = stock_ids
        await db.flush()
        await db.refresh(watchlist)
        return watchlist

    @staticmethod
    async def add_stock(db: AsyncSession, watchlist_id: UUID, user_id: UUID, stock_id: UUID) -> Optional[Watchlist]:
        watchlist = await WatchlistService.get_watchlist(db, watchlist_id, user_id)
        if not watchlist:
            return None
        if stock_id not in watchlist.stock_ids:
            watchlist.stock_ids = list(watchlist.stock_ids) + [stock_id]
        await db.flush()
        await db.refresh(watchlist)
        return watchlist

    @staticmethod
    async def remove_stock(db: AsyncSession, watchlist_id: UUID, user_id: UUID, stock_id: UUID) -> Optional[Watchlist]:
        watchlist = await WatchlistService.get_watchlist(db, watchlist_id, user_id)
        if not watchlist:
            return None
        if stock_id in watchlist.stock_ids:
            new_ids = [sid for sid in watchlist.stock_ids if sid != stock_id]
            watchlist.stock_ids = new_ids
        await db.flush()
        await db.refresh(watchlist)
        return watchlist

    @staticmethod
    async def delete_watchlist(db: AsyncSession, watchlist_id: UUID, user_id: UUID) -> bool:
        watchlist = await WatchlistService.get_watchlist(db, watchlist_id, user_id)
        if not watchlist:
            return False
        await db.delete(watchlist)
        await db.flush()
        return True

    @staticmethod
    async def get_stocks_in_watchlist(db: AsyncSession, watchlist_id: UUID, user_id: UUID) -> list[StockSearchItem]:
        watchlist = await WatchlistService.get_watchlist(db, watchlist_id, user_id)
        if not watchlist or not watchlist.stock_ids:
            return []
        result = await db.execute(
            select(Stock).where(Stock.id.in_(watchlist.stock_ids))
        )
        stocks = result.scalars().all()
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

    # --- Alerts ---

    @staticmethod
    async def create_alert(db: AsyncSession, user_id: UUID, stock_id: UUID,
                           metric: str, operator: str, threshold: float,
                           channels: list[str] = None) -> Alert:
        alert = Alert(
            user_id=user_id,
            stock_id=stock_id,
            metric=metric,
            operator=operator,
            threshold=threshold,
            channels=channels or [],
        )
        db.add(alert)
        await db.flush()
        await db.refresh(alert)
        return alert

    @staticmethod
    async def get_user_alerts(db: AsyncSession, user_id: UUID) -> tuple[list[Alert], int]:
        result = await db.execute(
            select(Alert).where(Alert.user_id == user_id).order_by(Alert.created_at.desc())
        )
        alerts = list(result.scalars().all())
        return alerts, len(alerts)

    @staticmethod
    async def get_alert(db: AsyncSession, alert_id: UUID, user_id: UUID) -> Optional[Alert]:
        result = await db.execute(
            select(Alert).where(Alert.id == alert_id, Alert.user_id == user_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def update_alert(db: AsyncSession, alert_id: UUID, user_id: UUID, **kwargs) -> Optional[Alert]:
        alert = await WatchlistService.get_alert(db, alert_id, user_id)
        if not alert:
            return None
        allowed_fields = {"metric", "operator", "threshold", "enabled", "channels"}
        for key, value in kwargs.items():
            if value is not None and key in allowed_fields and hasattr(alert, key):
                setattr(alert, key, value)
        await db.flush()
        await db.refresh(alert)
        return alert

    @staticmethod
    async def delete_alert(db: AsyncSession, alert_id: UUID, user_id: UUID) -> bool:
        alert = await WatchlistService.get_alert(db, alert_id, user_id)
        if not alert:
            return False
        await db.delete(alert)
        await db.flush()
        return True

    # --- Notes ---

    @staticmethod
    async def create_note(db: AsyncSession, user_id: UUID, stock_id: UUID,
                          title: str, content: str, tags: list[str] = None) -> AnalysisNote:
        note = AnalysisNote(
            user_id=user_id,
            stock_id=stock_id,
            title=title,
            content=content,
            tags=tags or [],
        )
        db.add(note)
        await db.flush()
        await db.refresh(note)
        return note

    @staticmethod
    async def get_notes(db: AsyncSession, user_id: UUID,
                         stock_id: Optional[UUID] = None) -> tuple[list[AnalysisNote], int]:
        conditions = [AnalysisNote.user_id == user_id]
        if stock_id:
            conditions.append(AnalysisNote.stock_id == stock_id)
        base_where = conditions[0]
        for cond in conditions[1:]:
            base_where = base_where & cond
        result = await db.execute(
            select(AnalysisNote).where(base_where).order_by(AnalysisNote.updated_at.desc())
        )
        notes = list(result.scalars().all())
        return notes, len(notes)

    @staticmethod
    async def get_note(db: AsyncSession, note_id: UUID, user_id: UUID) -> Optional[AnalysisNote]:
        result = await db.execute(
            select(AnalysisNote).where(AnalysisNote.id == note_id, AnalysisNote.user_id == user_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def update_note(db: AsyncSession, note_id: UUID, user_id: UUID, **kwargs) -> Optional[AnalysisNote]:
        note = await WatchlistService.get_note(db, note_id, user_id)
        if not note:
            return None
        allowed_fields = {"title", "content", "tags"}
        for key, value in kwargs.items():
            if value is not None and key in allowed_fields and hasattr(note, key):
                setattr(note, key, value)
        await db.flush()
        await db.refresh(note)
        return note

    @staticmethod
    async def delete_note(db: AsyncSession, note_id: UUID, user_id: UUID) -> bool:
        note = await WatchlistService.get_note(db, note_id, user_id)
        if not note:
            return False
        await db.delete(note)
        await db.flush()
        return True
