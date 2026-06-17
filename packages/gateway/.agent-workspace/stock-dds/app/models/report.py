"""
分析报告模型
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


class AnalysisReport(Base):
    """分析报告"""
    __tablename__ = "analysis_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    stock_id: Mapped[int] = mapped_column(Integer, ForeignKey("stocks.id"), nullable=False)
    report_date: Mapped[str] = mapped_column(String(10), nullable=False, comment="报告日期")
    report_type: Mapped[str] = mapped_column(String(20), nullable=False, comment="报告类型(full/quick/update)")

    # 综合评级
    overall_rating: Mapped[Optional[str]] = mapped_column(String(20), comment="综合评级(买入/增持/持有/减持/卖出)")
    overall_score: Mapped[Optional[float]] = mapped_column(Float, comment="综合评分(0-100)")

    # 各维度评分
    profitability_score: Mapped[Optional[float]] = mapped_column(Float, comment="盈利能力评分")
    growth_score: Mapped[Optional[float]] = mapped_column(Float, comment="成长能力评分")
    financial_health_score: Mapped[Optional[float]] = mapped_column(Float, comment="财务健康评分")
    valuation_score: Mapped[Optional[float]] = mapped_column(Float, comment="估值评分")
    quality_score: Mapped[Optional[float]] = mapped_column(Float, comment="经营质量评分")

    # 报告内容
    summary: Mapped[Optional[str]] = mapped_column(Text, comment="投资摘要")
    investment_highlights: Mapped[Optional[str]] = mapped_column(Text, comment="投资亮点(JSON)")
    risk_warnings: Mapped[Optional[str]] = mapped_column(Text, comment="风险提示(JSON)")
    key_metrics: Mapped[Optional[str]] = mapped_column(Text, comment="关键指标(JSON)")

    # 目标价
    target_price_low: Mapped[Optional[float]] = mapped_column(Float, comment="目标价(低)")
    target_price_mid: Mapped[Optional[float]] = mapped_column(Float, comment="目标价(中)")
    target_price_high: Mapped[Optional[float]] = mapped_column(Float, comment="目标价(高)")

    # 报告文件
    pdf_path: Mapped[Optional[str]] = mapped_column(String(500), comment="PDF报告路径")
    status: Mapped[str] = mapped_column(String(20), default="pending", comment="状态(pending/generating/completed/failed)")

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, comment="完成时间")

    stock = relationship("Stock", back_populates="reports")

    __table_args__ = (
        Index("idx_report_stock_date", "stock_id", "report_date"),
        Index("idx_report_type", "report_type"),
    )
