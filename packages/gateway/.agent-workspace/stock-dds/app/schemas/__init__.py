"""
Pydantic Schemas - 请求/响应数据结构
"""
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ============= 通用 =============

class ResponseBase(BaseModel):
    code: int = Field(200, description="状态码")
    message: str = Field("success", description="消息")
    data: Optional[Any] = Field(None, description="数据")


class PaginationParams(BaseModel):
    page: int = Field(1, ge=1, description="页码")
    page_size: int = Field(20, ge=1, le=100, description="每页条数")


class PaginatedResponse(ResponseBase):
    total: int = 0
    page: int = 1
    page_size: int = 20


# ============= 股票 =============

class StockBase(BaseModel):
    code: str = Field(..., description="股票代码")
    name: str = Field(..., description="股票名称")
    market: str = Field(..., description="市场")
    exchange: str = Field(..., description="交易所")


class StockCreate(StockBase):
    sector: Optional[str] = None
    industry: Optional[str] = None


class StockOut(StockBase):
    id: int
    sector: Optional[str] = None
    industry: Optional[str] = None
    market_cap: Optional[float] = None
    list_date: Optional[datetime] = None

    class Config:
        from_attributes = True


class StockOverview(BaseModel):
    """股票概览"""
    stock: StockOut
    current_price: Optional[float] = None
    price_change_1d: Optional[float] = None
    price_change_1m: Optional[float] = None
    pe_ratio: Optional[float] = None
    pb_ratio: Optional[float] = None
    market_cap: Optional[float] = None
    roe: Optional[float] = None
    revenue_latest: Optional[float] = None
    net_profit_latest: Optional[float] = None
    overall_rating: Optional[str] = None
    overall_score: Optional[float] = None


# ============= 财务数据 =============

class IncomeStatementOut(BaseModel):
    report_date: str
    report_type: str
    fiscal_year: int
    period: str
    revenue: Optional[float] = None
    revenue_yoy: Optional[float] = None
    gross_profit: Optional[float] = None
    operating_profit: Optional[float] = None
    net_profit: Optional[float] = None
    net_profit_yoy: Optional[float] = None
    net_profit_excl: Optional[float] = None
    eps_basic: Optional[float] = None
    rd_expense: Optional[float] = None

    class Config:
        from_attributes = True


class BalanceSheetOut(BaseModel):
    report_date: str
    total_assets: Optional[float] = None
    current_assets: Optional[float] = None
    cash_and_equivalents: Optional[float] = None
    accounts_receivable: Optional[float] = None
    inventories: Optional[float] = None
    total_liabilities: Optional[float] = None
    current_liabilities: Optional[float] = None
    total_equity: Optional[float] = None
    bvps: Optional[float] = None

    class Config:
        from_attributes = True


class CashFlowOut(BaseModel):
    report_date: str
    operating_cash_flow: Optional[float] = None
    investing_cash_flow: Optional[float] = None
    financing_cash_flow: Optional[float] = None
    free_cash_flow: Optional[float] = None

    class Config:
        from_attributes = True


class FinancialRatioOut(BaseModel):
    report_date: str
    period: str
    # 盈利能力
    gross_margin: Optional[float] = None
    operating_margin: Optional[float] = None
    net_margin: Optional[float] = None
    roe: Optional[float] = None
    roa: Optional[float] = None
    roic: Optional[float] = None
    # 营运能力
    inventory_turnover: Optional[float] = None
    receivable_turnover: Optional[float] = None
    total_asset_turnover: Optional[float] = None
    # 偿债能力
    current_ratio: Optional[float] = None
    quick_ratio: Optional[float] = None
    debt_to_equity: Optional[float] = None
    interest_coverage: Optional[float] = None
    # 成长能力
    revenue_growth: Optional[float] = None
    net_profit_growth: Optional[float] = None
    # 杜邦分析
    dupont_net_margin: Optional[float] = None
    dupont_asset_turnover: Optional[float] = None
    dupont_equity_multiplier: Optional[float] = None
    # 现金流
    ocf_to_net_profit: Optional[float] = None
    free_cash_flow_yield: Optional[float] = None
    # 估值
    pe_ratio: Optional[float] = None
    pb_ratio: Optional[float] = None
    ps_ratio: Optional[float] = None
    peg_ratio: Optional[float] = None
    ev_ebitda: Optional[float] = None

    class Config:
        from_attributes = True


class FinancialDataBundle(BaseModel):
    """财务数据包"""
    income_statements: List[IncomeStatementOut] = []
    balance_sheets: List[BalanceSheetOut] = []
    cash_flows: List[CashFlowOut] = []
    financial_ratios: List[FinancialRatioOut] = []


# ============= 估值 =============

class DCFInput(BaseModel):
    """DCF 估值输入"""
    discount_rate: float = Field(0.10, description="折现率")
    terminal_growth_rate: float = Field(0.03, description="永续增长率")
    projection_years: int = Field(5, description="预测年数")
    revenue_growth_rates: Optional[List[float]] = Field(None, description="各年营收增长率")
    profit_margins: Optional[List[float]] = Field(None, description="各年净利率")
    capex_rates: Optional[List[float]] = Field(None, description="各年资本支出率")


class ValuationResultOut(BaseModel):
    id: int
    valuation_date: str
    method: str
    current_price: Optional[float] = None
    estimated_value: float
    upside_potential: Optional[float] = None
    margin_of_safety: Optional[float] = None
    rating: Optional[str] = None
    confidence: Optional[float] = None
    detail_data: Optional[str] = None

    class Config:
        from_attributes = True


class MultiValuationResult(BaseModel):
    """多模型估值结果"""
    dcf: Optional[ValuationResultOut] = None
    pe_valuation: Optional[ValuationResultOut] = None
    pb_valuation: Optional[ValuationResultOut] = None
    ev_ebitda_valuation: Optional[ValuationResultOut] = None
    composite_value: Optional[float] = Field(None, description="综合估值")
    composite_rating: Optional[str] = Field(None, description="综合评级")
    target_price_range: Optional[Dict[str, float]] = None


# ============= 风险评估 =============

class RiskAssessmentOut(BaseModel):
    id: int
    assessment_date: str
    z_score: Optional[float] = None
    z_score_rating: Optional[str] = None
    liquidity_score: Optional[float] = None
    liquidity_risk_level: Optional[str] = None
    credit_score: Optional[float] = None
    credit_risk_level: Optional[str] = None
    earnings_quality_score: Optional[float] = None
    operating_risk_score: Optional[float] = None
    overall_risk_score: Optional[float] = None
    overall_risk_level: Optional[str] = None
    risk_factors: Optional[str] = None
    recommendations: Optional[str] = None

    class Config:
        from_attributes = True


# ============= 同业对比 =============

class PeerComparisonOut(BaseModel):
    peer_code: str
    peer_name: str
    pe_ratio: Optional[float] = None
    pb_ratio: Optional[float] = None
    roe: Optional[float] = None
    revenue_growth: Optional[float] = None
    net_margin: Optional[float] = None
    similarity_score: Optional[float] = None
    rank_in_peers: Optional[int] = None


# ============= 分析报告 =============

class AnalysisReportOut(BaseModel):
    id: int
    report_date: str
    report_type: str
    overall_rating: Optional[str] = None
    overall_score: Optional[float] = None
    profitability_score: Optional[float] = None
    growth_score: Optional[float] = None
    financial_health_score: Optional[float] = None
    valuation_score: Optional[float] = None
    quality_score: Optional[float] = None
    summary: Optional[str] = None
    target_price_low: Optional[float] = None
    target_price_mid: Optional[float] = None
    target_price_high: Optional[float] = None
    status: str = "pending"

    class Config:
        from_attributes = True


class AnalysisTriggerRequest(BaseModel):
    """触发分析请求"""
    stock_code: str = Field(..., description="股票代码")
    analysis_type: str = Field("full", description="分析类型(full/quick)")
    custom_params: Optional[Dict[str, Any]] = Field(None, description="自定义参数")
