import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, Enum, Float, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from src.database import Base
import enum


class MarketEnum(str, enum.Enum):
    US = "US"
    CN = "CN"
    HK = "HK"


class Stock(Base):
    __tablename__ = "stocks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticker = Column(String(20), nullable=False, index=True)
    exchange = Column(String(50), nullable=False)
    market = Column(Enum(MarketEnum), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    name_cn = Column(String(255), nullable=True)
    sector = Column(String(100), nullable=True, index=True)
    industry = Column(String(100), nullable=True, index=True)
    description = Column(Text, nullable=True)
    website = Column(String(500), nullable=True)
    employees = Column(Integer, nullable=True)
    founded_year = Column(Integer, nullable=True)
    current_price = Column(Float, nullable=True)
    market_cap = Column(Float, nullable=True)
    volume = Column(Float, nullable=True)
    avg_volume = Column(Float, nullable=True)
    day_high = Column(Float, nullable=True)
    day_low = Column(Float, nullable=True)
    week52_high = Column(Float, nullable=True)
    week52_low = Column(Float, nullable=True)
    dividend_yield = Column(Float, nullable=True)
    last_updated = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    financial_statements = relationship("FinancialStatement", back_populates="stock", cascade="all, delete-orphan")
    financial_ratios = relationship("FinancialRatio", back_populates="stock", cascade="all, delete-orphan")
    ai_analyses = relationship("AIAnalysis", back_populates="stock", cascade="all, delete-orphan")
