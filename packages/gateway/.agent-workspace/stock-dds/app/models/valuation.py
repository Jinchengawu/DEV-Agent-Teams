"""
估值模型结果
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import (
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


class ValuationResult(Base):
    """估值分析结果"""
    __tablename__ = "valuation_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    stock_id: Mapped[int] = mapped_column(Integer, ForeignKey("stocks.id"), nullable=False)
    valuation_date: Mapped[str] = mapped_column(String(10), nullable=False, comment="估值日期")
    method: Mapped[str] = mapped_column(String(50), nullable=False, comment="估值方法")

    # DCF 参数
    discount_rate: Mapped[Optional[float]] = mapped_column(Float, comment="折现率(%)")
    terminal_growth_rate: Mapped[Optional[float]] = mapped_column(Float, comment="永续增长率(%)")
    projection_years: Mapped[Optional[int]] = mapped_column(Integer, comment="预测年数")

    # 估值输入
    current_price: Mapped[Optional[float]] = mapped_column(Float, comment="当前股价(元)")
    market_cap: Mapped[Optional[float]] = mapped_column(Float, comment="总市值(万元)")
    enterprise_value: Mapped[Optional[float]] = mapped_column(Float, comment="企业价值(万元)")

    # 估值结果
    estimated_value: Mapped[float] = mapped_column(Float, nullable=False, comment="估值结果(元/股)")
    upside_potential: Mapped[Optional[float]] = mapped_column(Float, comment="上涨空间(%)")
    margin_of_safety: Mapped[Optional[float]] = mapped_column(Float, comment="安全边际(%)")

    # 评级
    rating: Mapped[Optional[str]] = mapped_column(String(20), comment="评级(严重低估/低估/合理/高估/严重高估)")
    confidence: Mapped[Optional[float]] = mapped_column(Float, comment="置信度(0-1)")

    # 详细数据(JSON)
    detail_data: Mapped[Optional[str]] = mapped_column(Text, comment="详细数据(JSON)")

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    stock = relationship("Stock", back_populates="valuations")

    __table_args__ = (
        Index("idx_valuation_stock_date", "stock_id", "valuation_date"),
        Index("idx_valuation_method", "method"),
    )


class PeerComparison(Base):
    """同业对比数据"""
    __tablename__ = "peer_comparisons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    stock_id: Mapped[int] = mapped_column(Integer, ForeignKey("stocks.id"), nullable=False)
    peer_stock_id: Mapped[int] = mapped_column(Integer, ForeignKey("stocks.id"), nullable=False)
    compare_date: Mapped[str] = mapped_column(String(10), nullable=False, comment="对比日期")
    industry: Mapped[str] = mapped_column(String(50), nullable=False, comment="行业")

    # 各项对比指标
    pe_diff: Mapped[Optional[float]] = mapped_column(Float, comment="PE 差异")
    pb_diff: Mapped[Optional[float]] = mapped_column(Float, comment="PB 差异")
    roe_diff: Mapped[Optional[float]] = mapped_column(Float, comment="ROE 差异")
    growth_diff: Mapped[Optional[float]] = mapped_column(Float, comment="增长率差异")
    margin_diff: Mapped[Optional[float]] = mapped_column(Float, comment="净利率差异")

    # 综合得分
    similarity_score: Mapped[Optional[float]] = mapped_column(Float, comment="相似度得分(0-100)")
    rank_in_peers: Mapped[Optional[int]] = mapped_column(Integer, comment="在同业中的排名")

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    stock = relationship("Stock", foreign_keys=[stock_id], back_populates="valuations")
