import uuid
from datetime import date, datetime
from sqlalchemy import Column, String, Integer, Date, DateTime, Enum, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from src.database import Base
import enum


class StatementType(str, enum.Enum):
    INCOME = "income"
    BALANCE_SHEET = "balance_sheet"
    CASH_FLOW = "cash_flow"


class Period(str, enum.Enum):
    ANNUAL = "annual"
    QUARTERLY = "quarterly"


class FinancialStatement(Base):
    __tablename__ = "financial_statements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    stock_id = Column(UUID(as_uuid=True), ForeignKey("stocks.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(Enum(StatementType), nullable=False)
    period = Column(Enum(Period), nullable=False)
    fiscal_year = Column(Integer, nullable=False)
    fiscal_quarter = Column(Integer, nullable=True)
    report_date = Column(Date, nullable=False)
    currency = Column(String(10), default="USD")
    items = Column(JSONB, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    stock = relationship("Stock", back_populates="financial_statements")


class FinancialRatio(Base):
    __tablename__ = "financial_ratios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    stock_id = Column(UUID(as_uuid=True), ForeignKey("stocks.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    profitability = Column(JSONB, nullable=False, default=dict)
    growth = Column(JSONB, nullable=False, default=dict)
    solvency = Column(JSONB, nullable=False, default=dict)
    efficiency = Column(JSONB, nullable=False, default=dict)
    valuation = Column(JSONB, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    stock = relationship("Stock", back_populates="financial_ratios")
