"""Tests for AI analysis endpoints — uses mock LLM to avoid API calls."""
import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_generate_summary(client: AsyncClient, sample_stock, sample_ratios):
    """Test AI summary generation with mocked LLM response."""
    mock_response_content = """## 公司简介
Apple Inc. is a technology company with strong financials.

## 近期表现
Revenue grew 15% YoY. Net margin at 25%.

## 3 个亮点
1. Strong ROE of 45%
2. High gross margin
3. Consistent earnings growth

## 3 个风险
1. High PE ratio
2. Market saturation
3. Regulatory pressure

## 综合评估
Overall strong fundamentals.

CONFIDENCE: 0.85"""

    mock_completion = AsyncMock()
    mock_completion.choices = [
        type("Choice", (), {"message": type("Message", (), {"content": mock_response_content})})()
    ]

    with patch("src.services.ai_service.AsyncOpenAI") as mock_client:
        mock_client.return_value.chat.completions.create = AsyncMock(return_value=mock_completion)

        response = await client.post("/api/v1/ai/summary", json={
            "stock_id": str(sample_stock.id),
            "type": "summary",
            "language": "zh",
        })

    assert response.status_code == 201
    data = response.json()
    assert "content" in data
    assert "Apple" in data["content"]
    assert data["type"] == "summary"
    assert data["confidence_score"] == 0.85
    assert "CONFIDENCE" not in data["content"]  # Should be stripped


@pytest.mark.asyncio
async def test_generate_moat_analysis(client: AsyncClient, sample_stock, sample_ratios):
    """Test moat analysis generation with mocked LLM."""
    mock_content = """## 品牌护城河 4/5
Strong brand recognition.

## 转换成本 3/5
Moderate switching costs in ecosystem.

CONFIDENCE: 0.75"""

    mock_completion = AsyncMock()
    mock_completion.choices = [
        type("Choice", (), {"message": type("Message", (), {"content": mock_content})})()
    ]

    with patch("src.services.ai_service.AsyncOpenAI") as mock_client:
        mock_client.return_value.chat.completions.create = AsyncMock(return_value=mock_completion)

        response = await client.post("/api/v1/ai/moat", params={"stock_id": str(sample_stock.id)})

    assert response.status_code == 201
    data = response.json()
    assert data["type"] == "moat"
    assert data["confidence_score"] == 0.75


@pytest.mark.asyncio
async def test_generate_risk_scan(client: AsyncClient, sample_stock, sample_ratios):
    """Test risk scan generation with mocked LLM."""
    mock_content = """## 财务风险 Low
## 经营风险 Medium
CONFIDENCE: 0.8"""

    mock_completion = AsyncMock()
    mock_completion.choices = [
        type("Choice", (), {"message": type("Message", (), {"content": mock_content})})()
    ]

    with patch("src.services.ai_service.AsyncOpenAI") as mock_client:
        mock_client.return_value.chat.completions.create = AsyncMock(return_value=mock_completion)

        response = await client.post("/api/v1/ai/risk", params={"stock_id": str(sample_stock.id)})

    assert response.status_code == 201
    data = response.json()
    assert data["type"] == "risk"


@pytest.mark.asyncio
async def test_ask_question(client: AsyncClient, sample_stock, sample_ratios):
    """Test ask endpoint with mocked LLM."""
    mock_answer = "Apple's ROE is currently 45% which indicates strong profitability."

    mock_completion = AsyncMock()
    mock_completion.choices = [
        type("Choice", (), {"message": type("Message", (), {"content": mock_answer})})()
    ]

    with patch("src.services.ai_service.AsyncOpenAI") as mock_client:
        mock_client.return_value.chat.completions.create = AsyncMock(return_value=mock_completion)

        response = await client.post("/api/v1/ai/ask", json={
            "stock_id": str(sample_stock.id),
            "question": "What is Apple's current ROE?",
        })

    assert response.status_code == 200
    data = response.json()
    assert "Apple" in data["answer"]
    assert "45%" in data["answer"]


@pytest.mark.asyncio
async def test_get_analysis_history(client: AsyncClient, sample_stock):
    """Test getting analysis history (should be empty initially without saving)."""
    response = await client.get(f"/api/v1/ai/history/{sample_stock.id}")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["analyses"], list)
    assert isinstance(data["total"], int)


@pytest.mark.asyncio
async def test_summary_nonexistent_stock(client: AsyncClient):
    """Should return 404 for nonexistent stock."""
    import uuid
    response = await client.post("/api/v1/ai/summary", json={
        "stock_id": str(uuid.uuid4()),
        "type": "summary",
        "language": "zh",
    })
    assert response.status_code == 404
