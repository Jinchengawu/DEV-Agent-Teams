from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID
from typing import Optional
from src.models.ai_analysis import AnalysisType


class AIAnalysisRequest(BaseModel):
    stock_id: UUID
    type: AnalysisType
    language: str = Field(default="zh", pattern="^(zh|en)$")


class AIAnalysisResponse(BaseModel):
    id: UUID
    stock_id: UUID
    type: AnalysisType
    generated_at: datetime
    model: str
    content: str
    confidence_score: Optional[float] = None

    model_config = {"from_attributes": True}


class AIAnalysisHistoryResponse(BaseModel):
    analyses: list[AIAnalysisResponse]
    total: int


class AIAskRequest(BaseModel):
    stock_id: UUID
    question: str = Field(min_length=1, max_length=1000)


class AIAskResponse(BaseModel):
    answer: str
    model: str
    generated_at: datetime
