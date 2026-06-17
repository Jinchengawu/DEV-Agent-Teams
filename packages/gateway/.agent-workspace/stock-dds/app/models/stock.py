"""
股票基础信息模型
"""
from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    BigInteger,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Stock(Base):
    """股票基础信息"""
    __tablename__ = "stocks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False, comment="股票代码")
    name: Mapped[str] = mapped_column(String(50), nullable=False, comment="股票名称")
    market: Mapped[str] = mapped_column(String(10), nullable=False, comment="市场(A股/港股/美股)")
    exchange: Mapped[str] = mapped_column(String(20), nullable=False, comment="交易所(SH/SZ/HK/US)")
    sector: Mapped[Optional[str]] = mapped_column(String(50), comment="板块")
    industry: Mapped[Optional[str]] = mapped_column(String(50), comment="行业")
    sub_industry: Mapped[Optional[str]] = mapped_column(String(50), comment="子行业")
    list_date: Mapped[Optional[datetime]] = mapped_column(DateTime, comment="上市日期")
    total_shares: Mapped[Optional[float]] = mapped_column(Float, comment="总股本(万股)")
    float_shares: Mapped[Optional[float]] = mapped_column(Float, comment="流通股本(万股)")
    market_cap: Mapped[Optional[float]] = mapped_column(Float, comment="总市值(万元)")
    description: Mapped[Optional[str]] = mapped_column(Text, comment="公司简介")
    website: Mapped[Optional[str]] = mapped_column(String(200), comment="公司官网")
    chairman: Mapped[Optional[str]] = mapped_column(String(50), comment="董事长")
    secretary: Mapped[Optional[str]] = mapped_column(String(50), comment="董秘")
    employees: Mapped[Optional[int]] = mapped_column(Integer, comment="员工人数")
    is_active: Mapped[bool] = mapped_column(default=True, comment="是否活跃")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), comment="创建时间"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间"
    )

    # 关系
    income_statements: Mapped[List["IncomeStatement"]] = relationship(back_populates="stock")
    balance_sheets: Mapped[List["BalanceSheet"]] = relationship(back_populates="stock")
    cash_flows: Mapped[List["CashFlowStatement"]] = relationship(back_populates="stock")
    financial_ratios: Mapped[List["FinancialRatio"]] = relationship(back_populates="stock")
    valuations: Mapped[List["ValuationResult"]] = relationship(back_populates="stock")
    risks: Mapped[List["RiskAssessment"]] = relationship(back_populates="stock")
    reports: Mapped[List["AnalysisReport"]] = relationship(back_populates="stock")

    __table_args__ = (
        Index("idx_stocks_code", "code"),
        Index("idx_stocks_market", "market"),
        Index("idx_stocks_industry", "industry"),
    )


class StockIndustry(Base):
    """行业分类"""
    __tablename__ = "stock_industries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, comment="行业代码")
    name: Mapped[str] = mapped_column(String(50), nullable=False, comment="行业名称")
    level: Mapped[int] = mapped_column(Integer, default=1, comment="行业级别(1/2/3)")
    parent_code: Mapped[Optional[str]] = mapped_column(String(20), comment="上级行业代码")
    description: Mapped[Optional[str]] = mapped_column(Text, comment="行业描述")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )
