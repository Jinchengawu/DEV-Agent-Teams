from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.schemas.ai_analysis import (
    AIAnalysisRequest,
    AIAnalysisResponse,
    AIAnalysisHistoryResponse,
    AIAskRequest,
    AIAskResponse,
)
from src.models.ai_analysis import AnalysisType
from src.services.ai_service import AIService
from src.services.auth_service import get_current_user
from src.models.user import User

router = APIRouter()


@router.post("/summary", response_model=AIAnalysisResponse, status_code=status.HTTP_201_CREATED)
async def generate_summary(
    request: AIAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate AI-powered financial summary for a stock."""
    if request.type != AnalysisType.SUMMARY:
        raise HTTPException(status_code=400, detail="Use /summary endpoint for summary type only")
    try:
        analysis = await AIService.generate_summary(db, request.stock_id, request.language)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return analysis


@router.post("/moat", response_model=AIAnalysisResponse, status_code=status.HTTP_201_CREATED)
async def generate_moat_analysis(
    stock_id: UUID = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate competitive moat analysis."""
    try:
        analysis = await AIService.generate_moat_analysis(db, stock_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return analysis


@router.post("/risk", response_model=AIAnalysisResponse, status_code=status.HTTP_201_CREATED)
async def generate_risk_scan(
    stock_id: UUID = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate investment risk assessment."""
    try:
        analysis = await AIService.generate_risk_scan(db, stock_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return analysis


@router.post("/ask", response_model=AIAskResponse)
async def ask_question(
    request: AIAskRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Ask a natural language question about a stock."""
    try:
        result = await AIService.answer_question(db, request.stock_id, request.question)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return result


@router.get("/history/{stock_id}", response_model=AIAnalysisHistoryResponse)
async def get_analysis_history(
    stock_id: UUID,
    type: AnalysisType = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get historical AI analyses for a stock."""
    analyses = await AIService.get_analysis_history(db, stock_id, analysis_type=type)
    return AIAnalysisHistoryResponse(analyses=list(analyses), total=len(analyses))
