import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Enum, Float, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from src.database import Base
import enum


class AnalysisType(str, enum.Enum):
    SUMMARY = "summary"
    MOAT = "moat"
    RISK = "risk"
    QA = "qa"


class AIAnalysis(Base):
    __tablename__ = "ai_analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    stock_id = Column(UUID(as_uuid=True), ForeignKey("stocks.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(Enum(AnalysisType), nullable=False)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    model = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)
    confidence_score = Column(Float, nullable=True)
    data_snapshot = Column(Text, nullable=True)  # JSON string of source data snapshot

    stock = relationship("Stock", back_populates="ai_analyses")
