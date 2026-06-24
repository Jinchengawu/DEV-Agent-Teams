import json
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from openai import AsyncOpenAI
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.models.ai_analysis import AIAnalysis, AnalysisType
from src.models.financial import FinancialStatement, StatementType, Period, FinancialRatio
from src.models.stock import Stock


def _get_llm_client() -> AsyncOpenAI:
    return AsyncOpenAI(
        api_key=settings.llm_api_key,
        base_url=settings.llm_base_url,
    )


class AIService:
    @staticmethod
    async def generate_summary(db: AsyncSession, stock_id: UUID, language: str = "zh") -> AIAnalysis:
        """Generate AI-powered financial summary for a stock."""
        stock = await db.get(Stock, stock_id)
        if not stock:
            raise ValueError("Stock not found")

        # Collect financial data for context
        context = await AIService._build_context(db, stock_id)

        client = _get_llm_client()

        lang_instruction = "请用中文回复" if language == "zh" else "Please respond in English"

        prompt = f"""You are a professional equity research analyst. Analyze the following company's fundamentals.

Company: {stock.name} ({stock.ticker})
Sector: {stock.sector or 'N/A'}
Industry: {stock.industry or 'N/A'}

Financial Data:
{context}

{lang_instruction}

Please provide a structured analysis in Markdown format with these sections:
1. **公司简介** / **Company Overview** (2-3 sentences)
2. **近期表现** / **Recent Performance** (revenue, profit trends)
3. **3 个亮点** / **3 Highlights**
4. **3 个风险** / **3 Risks**
5. **综合评估** / **Overall Assessment**

Total length: 500-800 words. Be specific with numbers and trends. Use data from the context provided.
IMPORTANT: At the end, add a line: "CONFIDENCE: X.X" where X.X is a 0.0-1.0 confidence score.
If there is insufficient financial data, be honest about it and lower the confidence score."""

        response = await client.chat.completions.create(
            model=settings.llm_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2000,
        )

        content = response.choices[0].message.content

        # Extract confidence score
        confidence_score = 0.7  # default
        if content and "CONFIDENCE:" in content:
            try:
                # Extract the confidence line
                for line in content.split("\n"):
                    if "CONFIDENCE:" in line:
                        score_str = line.split("CONFIDENCE:")[-1].strip().split()[0]
                        confidence_score = float(score_str)
                        break
                # Remove the confidence line from content
                content = "\n".join(
                    line for line in content.split("\n") if "CONFIDENCE:" not in line
                ).strip()
            except (ValueError, IndexError):
                pass

        analysis = AIAnalysis(
            stock_id=stock_id,
            type=AnalysisType.SUMMARY,
            model=settings.llm_model,
            content=content or "Unable to generate analysis. Insufficient data available.",
            confidence_score=confidence_score,
            data_snapshot=json.dumps({"source": "financial_statements_and_ratios"}),
        )

        db.add(analysis)
        await db.flush()
        await db.refresh(analysis)
        return analysis

    @staticmethod
    async def generate_moat_analysis(db: AsyncSession, stock_id: UUID) -> AIAnalysis:
        """Generate moat/competitive advantage analysis."""
        stock = await db.get(Stock, stock_id)
        if not stock:
            raise ValueError("Stock not found")

        context = await AIService._build_context(db, stock_id)

        client = _get_llm_client()

        prompt = f"""You are a value investor following Warren Buffett and Morningstar's methodology.
Analyze the competitive moat of the following company.

Company: {stock.name} ({stock.ticker})
Sector: {stock.sector or 'N/A'}

Financial Context:
{context}

Evaluate the company's moat across these 5 dimensions (1-5 scale each):
1. **品牌护城河** / **Brand Moat**: Brand recognition, pricing power, customer loyalty
2. **转换成本** / **Switching Costs**: How hard is it for customers to switch?
3. **网络效应** / **Network Effects**: Does value increase with more users?
4. **成本优势** / **Cost Advantage**: Lower costs than competitors?
5. **规模效应** / **Scale Efficiency**: Benefits from being large?

Provide:
- A rating for each dimension with specific evidence
- Overall moat width: **Wide** / **Narrow** / **None**
- Key threats to the moat

Format as Markdown. Include a "CONFIDENCE: X.X" line at the end."""

        response = await client.chat.completions.create(
            model=settings.llm_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2000,
        )

        content = response.choices[0].message.content
        confidence_score = AIService._extract_confidence(content)

        if content:
            content = "\n".join(
                line for line in content.split("\n") if "CONFIDENCE:" not in line
            ).strip()

        analysis = AIAnalysis(
            stock_id=stock_id,
            type=AnalysisType.MOAT,
            model=settings.llm_model,
            content=content or "Unable to complete moat analysis.",
            confidence_score=confidence_score,
        )
        db.add(analysis)
        await db.flush()
        await db.refresh(analysis)
        return analysis

    @staticmethod
    async def generate_risk_scan(db: AsyncSession, stock_id: UUID) -> AIAnalysis:
        """Generate risk assessment for a stock."""
        stock = await db.get(Stock, stock_id)
        if not stock:
            raise ValueError("Stock not found")

        context = await AIService._build_context(db, stock_id)

        client = _get_llm_client()

        prompt = f"""You are a risk analyst. Identify and assess investment risks for the following company.

Company: {stock.name} ({stock.ticker})
Sector: {stock.sector or 'N/A'}
Industry: {stock.industry or 'N/A'}

Financial Context:
{context}

Analyze risks across these categories:
1. **财务风险** / **Financial Risk**: Debt levels, cash flow, liquidity
2. **经营风险** / **Operational Risk**: Customer concentration, product dependency, supply chain
3. **治理风险** / **Governance Risk**: Management issues, related-party transactions
4. **行业风险** / **Industry Risk**: Regulation, technology disruption, competition

For each risk found:
- Severity: High / Medium / Low
- Probability: High / Medium / Low
- Brief explanation

Format as Markdown. Include "CONFIDENCE: X.X" at the end."""

        response = await client.chat.completions.create(
            model=settings.llm_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2000,
        )

        content = response.choices[0].message.content
        confidence_score = AIService._extract_confidence(content)

        if content:
            content = "\n".join(
                line for line in content.split("\n") if "CONFIDENCE:" not in line
            ).strip()

        analysis = AIAnalysis(
            stock_id=stock_id,
            type=AnalysisType.RISK,
            model=settings.llm_model,
            content=content or "Unable to complete risk scan.",
            confidence_score=confidence_score,
        )
        db.add(analysis)
        await db.flush()
        await db.refresh(analysis)
        return analysis

    @staticmethod
    async def answer_question(db: AsyncSession, stock_id: UUID, question: str) -> dict:
        """Chat with a stock — answer a natural language question about a company."""
        stock = await db.get(Stock, stock_id)
        if not stock:
            raise ValueError("Stock not found")

        context = await AIService._build_context(db, stock_id)

        client = _get_llm_client()

        prompt = f"""You are a knowledgeable financial analyst. Answer the following question about a company.

Company: {stock.name} ({stock.ticker})
Sector: {stock.sector or 'N/A'}

Available Financial Data:
{context}

Question: {question}

Provide a clear, data-driven answer. Reference specific numbers from the data when relevant.
Be concise but thorough. If the data doesn't contain enough information to fully answer, be honest about limitations."""

        response = await client.chat.completions.create(
            model=settings.llm_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_tokens=1500,
        )

        return {
            "answer": response.choices[0].message.content,
            "model": settings.llm_model,
            "generated_at": datetime.now(timezone.utc),
        }

    @staticmethod
    async def get_analysis_history(
        db: AsyncSession, stock_id: UUID, analysis_type: Optional[AnalysisType] = None,
    ) -> list[AIAnalysis]:
        """Get historical AI analyses for a stock."""
        conditions = [AIAnalysis.stock_id == stock_id]
        if analysis_type:
            conditions.append(AIAnalysis.type == analysis_type)

        base_where = conditions[0]
        for cond in conditions[1:]:
            base_where = base_where & cond

        result = await db.execute(
            select(AIAnalysis)
            .where(base_where)
            .order_by(AIAnalysis.generated_at.desc())
            .limit(20)
        )
        return list(result.scalars().all())

    @staticmethod
    async def _build_context(db: AsyncSession, stock_id: UUID) -> str:
        """Build financial context string from database for AI prompts."""
        parts = []

        # Latest financial statements
        stmt_result = await db.execute(
            select(FinancialStatement)
            .where(
                FinancialStatement.stock_id == stock_id,
                FinancialStatement.period == Period.ANNUAL,
            )
            .order_by(FinancialStatement.fiscal_year.desc())
            .limit(3)
        )
        statements = stmt_result.scalars().all()

        for stmt in statements:
            type_label = {
                StatementType.INCOME: "Income Statement",
                StatementType.BALANCE_SHEET: "Balance Sheet",
                StatementType.CASH_FLOW: "Cash Flow",
            }.get(stmt.type, stmt.type.value)
            parts.append(f"\n### {type_label} {stmt.fiscal_year}")
            # Show top 15 items
            items = dict(list(stmt.items.items())[:15]) if stmt.items else {}
            for key, value in items.items():
                parts.append(f"- {key}: {_format_financial(value)}")

        # Latest financial ratios
        ratio_result = await db.execute(
            select(FinancialRatio)
            .where(FinancialRatio.stock_id == stock_id)
            .order_by(FinancialRatio.date.desc())
            .limit(2)
        )
        ratios = ratio_result.scalars().all()
        for ratio in ratios:
            parts.append(f"\n### Financial Ratios ({ratio.date})")
            for group_name, group_data in [
                ("Profitability", ratio.profitability),
                ("Growth", ratio.growth),
                ("Solvency", ratio.solvency),
                ("Efficiency", ratio.efficiency),
                ("Valuation", ratio.valuation),
            ]:
                if group_data:
                    parts.append(f"\n{group_name}:")
                    for k, v in group_data.items():
                        if v is not None:
                            parts.append(f"- {k}: {v}")

        return "\n".join(parts) if parts else "No detailed financial data available."

    @staticmethod
    def _extract_confidence(content: Optional[str]) -> float:
        if not content:
            return 0.5
        for line in content.split("\n"):
            if "CONFIDENCE:" in line:
                try:
                    score_str = line.split("CONFIDENCE:")[-1].strip().split()[0]
                    return min(max(float(score_str), 0.0), 1.0)
                except (ValueError, IndexError):
                    pass
        return 0.7


def _format_financial(value) -> str:
    """Format large numbers for readability in AI prompts."""
    if value is None:
        return "N/A"
    try:
        num = float(value)
        if abs(num) >= 1_000_000_000:
            return f"{num / 1_000_000_000:.2f}B"
        elif abs(num) >= 1_000_000:
            return f"{num / 1_000_000:.2f}M"
        elif abs(num) >= 1_000:
            return f"{num / 1_000:.1f}K"
        return f"{num:.2f}"
    except (ValueError, TypeError):
        return str(value)
