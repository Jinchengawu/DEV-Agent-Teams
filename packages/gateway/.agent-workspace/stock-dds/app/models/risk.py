"""
风险评估模型
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


class RiskAssessment(Base):
    """风险评估结果"""
    __tablename__ = "risk_assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    stock_id: Mapped[int] = mapped_column(Integer, ForeignKey("stocks.id"), nullable=False)
    assessment_date: Mapped[str] = mapped_column(String(10), nullable=False, comment="评估日期")

    # Altman Z-Score
    z_score: Mapped[Optional[float]] = mapped_column(Float, comment="Altman Z-Score")
    z_score_rating: Mapped[Optional[str]] = mapped_column(String(20), comment="Z-Score 评级(安全/灰色/危险)")

    # 流动性风险
    liquidity_score: Mapped[Optional[float]] = mapped_column(Float, comment="流动性风险评分(0-100)")
    liquidity_risk_level: Mapped[Optional[str]] = mapped_column(String(20), comment="流动性风险等级")

    # 信用风险
    credit_score: Mapped[Optional[float]] = mapped_column(Float, comment="信用风险评分(0-100)")
    credit_risk_level: Mapped[Optional[str]] = mapped_column(String(20), comment="信用风险等级")
    debt_burden: Mapped[Optional[float]] = mapped_column(Float, comment="债务负担评分")

    # 盈利风险
    earnings_quality_score: Mapped[Optional[float]] = mapped_column(Float, comment="盈利质量评分(0-100)")
    earnings_stability: Mapped[Optional[float]] = mapped_column(Float, comment="盈利稳定性评分")
    cash_flow_quality: Mapped[Optional[float]] = mapped_column(Float, comment="现金流质量评分")

    # 增长风险
    growth_sustainability: Mapped[Optional[float]] = mapped_column(Float, comment="增长可持续性评分(0-100)")

    # 经营风险
    operating_risk_score: Mapped[Optional[float]] = mapped_column(Float, comment="经营风险评分(0-100)")
    concentration_risk: Mapped[Optional[float]] = mapped_column(Float, comment="集中度风险")
    competition_risk: Mapped[Optional[float]] = mapped_column(Float, comment="竞争风险")

    # 综合评估
    overall_risk_score: Mapped[Optional[float]] = mapped_column(Float, comment="综合风险评分(0-100)")
    overall_risk_level: Mapped[Optional[str]] = mapped_column(String(20), comment="综合风险等级(低/中低/中/中高/高)")
    risk_factors: Mapped[Optional[str]] = mapped_column(Text, comment="风险因素列表(JSON)")
    recommendations: Mapped[Optional[str]] = mapped_column(Text, comment="风险建议(JSON)")

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    stock = relationship("Stock", back_populates="risks")

    __table_args__ = (
        Index("idx_risk_stock_date", "stock_id", "assessment_date"),
    )
