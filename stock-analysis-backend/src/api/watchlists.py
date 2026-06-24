from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.schemas.watchlist import (
    WatchlistCreate,
    WatchlistUpdate,
    WatchlistAddStock,
    WatchlistResponse,
    WatchlistDetailResponse,
    WatchlistListResponse,
    AlertCreate,
    AlertUpdate,
    AlertResponse,
    AlertListResponse,
    NoteCreate,
    NoteUpdate,
    NoteResponse,
    NoteListResponse,
)
from src.services.watchlist_service import WatchlistService
from src.services.auth_service import get_current_user
from src.models.user import User

router = APIRouter()


# --- Watchlists ---

@router.get("/", response_model=WatchlistListResponse)
async def list_watchlists(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    watchlists, total = await WatchlistService.get_user_watchlists(db, current_user.id)
    return WatchlistListResponse(watchlists=list(watchlists), total=total)


@router.post("/", response_model=WatchlistResponse, status_code=status.HTTP_201_CREATED)
async def create_watchlist(
    data: WatchlistCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    watchlist = await WatchlistService.create_watchlist(db, current_user.id, data.name, data.stock_ids)
    return watchlist


@router.get("/{watchlist_id}", response_model=WatchlistDetailResponse)
async def get_watchlist(
    watchlist_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    watchlist = await WatchlistService.get_watchlist(db, watchlist_id, current_user.id)
    if not watchlist:
        raise HTTPException(status_code=404, detail="Watchlist not found")

    stocks = await WatchlistService.get_stocks_in_watchlist(db, watchlist_id, current_user.id)
    return WatchlistDetailResponse(
        id=watchlist.id,
        user_id=watchlist.user_id,
        name=watchlist.name,
        stock_ids=watchlist.stock_ids,
        created_at=watchlist.created_at,
        updated_at=watchlist.updated_at,
        stocks=stocks,
    )


@router.put("/{watchlist_id}", response_model=WatchlistResponse)
async def update_watchlist(
    watchlist_id: UUID,
    data: WatchlistUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    watchlist = await WatchlistService.update_watchlist(
        db, watchlist_id, current_user.id, name=data.name, stock_ids=data.stock_ids
    )
    if not watchlist:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    return watchlist


@router.delete("/{watchlist_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_watchlist(
    watchlist_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    deleted = await WatchlistService.delete_watchlist(db, watchlist_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Watchlist not found")


@router.post("/{watchlist_id}/stocks", response_model=WatchlistResponse)
async def add_stock_to_watchlist(
    watchlist_id: UUID,
    data: WatchlistAddStock,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    watchlist = await WatchlistService.add_stock(db, watchlist_id, current_user.id, data.stock_id)
    if not watchlist:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    return watchlist


@router.delete("/{watchlist_id}/stocks/{stock_id}", response_model=WatchlistResponse)
async def remove_stock_from_watchlist(
    watchlist_id: UUID,
    stock_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    watchlist = await WatchlistService.remove_stock(db, watchlist_id, current_user.id, stock_id)
    if not watchlist:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    return watchlist


# --- Alerts ---

@router.get("/alerts", response_model=AlertListResponse)
async def list_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    alerts, total = await WatchlistService.get_user_alerts(db, current_user.id)
    return AlertListResponse(
        alerts=[
            AlertResponse(
                id=a.id,
                user_id=a.user_id,
                stock_id=a.stock_id,
                metric=a.metric,
                operator=a.operator,
                threshold=a.threshold,
                enabled=a.enabled == "1",
                channels=a.channels,
                created_at=a.created_at,
                updated_at=a.updated_at,
            )
            for a in alerts
        ],
        total=total,
    )


@router.post("/alerts", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(
    data: AlertCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    alert = await WatchlistService.create_alert(
        db, current_user.id, data.stock_id, data.metric, data.operator, data.threshold, data.channels
    )
    return AlertResponse(
        id=alert.id,
        user_id=alert.user_id,
        stock_id=alert.stock_id,
        metric=alert.metric,
        operator=alert.operator,
        threshold=alert.threshold,
        enabled=alert.enabled == "1",
        channels=alert.channels,
        created_at=alert.created_at,
        updated_at=alert.updated_at,
    )


@router.put("/alerts/{alert_id}", response_model=AlertResponse)
async def update_alert(
    alert_id: UUID,
    data: AlertUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    update_data = data.model_dump(exclude_unset=True)
    alert = await WatchlistService.update_alert(db, alert_id, current_user.id, **update_data)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return AlertResponse(
        id=alert.id,
        user_id=alert.user_id,
        stock_id=alert.stock_id,
        metric=alert.metric,
        operator=alert.operator,
        threshold=alert.threshold,
        enabled=alert.enabled == "1",
        channels=alert.channels,
        created_at=alert.created_at,
        updated_at=alert.updated_at,
    )


@router.delete("/alerts/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert(
    alert_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    deleted = await WatchlistService.delete_alert(db, alert_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Alert not found")


# --- Notes ---

@router.get("/notes", response_model=NoteListResponse)
async def list_notes(
    stock_id: UUID = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    notes, total = await WatchlistService.get_notes(db, current_user.id, stock_id=stock_id)
    return NoteListResponse(notes=list(notes), total=total)


@router.post("/notes", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    data: NoteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    note = await WatchlistService.create_note(
        db, current_user.id, data.stock_id, data.title, data.content, data.tags
    )
    return note


@router.get("/notes/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    note = await WatchlistService.get_note(db, note_id, current_user.id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.put("/notes/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: UUID,
    data: NoteUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    update_data = data.model_dump(exclude_unset=True)
    note = await WatchlistService.update_note(db, note_id, current_user.id, **update_data)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    deleted = await WatchlistService.delete_note(db, note_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Note not found")
