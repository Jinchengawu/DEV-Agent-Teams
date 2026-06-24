from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from src.schemas.stock import StockSearchItem


class WatchlistCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    stock_ids: list[UUID] = []


class WatchlistUpdate(BaseModel):
    name: Optional[str] = None
    stock_ids: Optional[list[UUID]] = None


class WatchlistAddStock(BaseModel):
    stock_id: UUID


class WatchlistRemoveStock(BaseModel):
    stock_id: UUID


class WatchlistResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    stock_ids: list[UUID]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WatchlistDetailResponse(WatchlistResponse):
    stocks: list["StockSearchItem"] = []


class WatchlistListResponse(BaseModel):
    watchlists: list[WatchlistResponse]
    total: int


class AlertCreate(BaseModel):
    stock_id: UUID
    metric: str = Field(min_length=1, max_length=50)
    operator: str = Field(pattern="^(gt|lt|gte|lte|changes_by)$")
    threshold: float
    channels: list[str] = []


class AlertUpdate(BaseModel):
    metric: Optional[str] = None
    operator: Optional[str] = None
    threshold: Optional[float] = None
    enabled: Optional[bool] = None
    channels: Optional[list[str]] = None


class AlertResponse(BaseModel):
    id: UUID
    user_id: UUID
    stock_id: UUID
    metric: str
    operator: str
    threshold: float
    enabled: bool
    channels: list[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AlertListResponse(BaseModel):
    alerts: list[AlertResponse]
    total: int


class NoteCreate(BaseModel):
    stock_id: UUID
    title: str = Field(min_length=1, max_length=200)
    content: str
    tags: list[str] = []


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[list[str]] = None


class NoteResponse(BaseModel):
    id: UUID
    user_id: UUID
    stock_id: UUID
    title: str
    content: str
    tags: list[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NoteListResponse(BaseModel):
    notes: list[NoteResponse]
    total: int
