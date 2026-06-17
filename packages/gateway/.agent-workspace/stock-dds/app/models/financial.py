"""
财务数据模型 - 三大报表 + 财务指标
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
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class IncomeStatement(Base):
    """利润表"""
    __tablename__ = "income_statements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    stock_id: Mapped[int] = mapped_column(Integer, ForeignKey("stocks.id"), nullable=False)
    report_date: Mapped[str] = mapped_column(String(10), nullable=False, comment="报告日期(YYYY-MM-DD)")
    report_type: Mapped[str] = mapped_column(String(10), nullable=False, comment="报告类型(年报/半年报/季报)")
    fiscal_year: Mapped[int] = mapped_column(Integer, nullable=False, comment="财年")
    period: Mapped[str] = mapped_column(String(10), nullable=False, comment="期间(Q1/Q2/Q3/Q4)")

    # 营业收入
    revenue: Mapped[Optional[float]] = mapped_column(Float, comment="营业总收入(万元)")
    revenue_yoy: Mapped[Optional[float]] = mapped_column(Float, comment="营收同比增长率(%)")
    cost_of_revenue: Mapped[Optional[float]] = mapped_column(Float, comment="营业成本(万元)")
    gross_profit: Mapped[Optional[float]] = mapped_column(Float, comment="毛利润(万元)")

    # 期间费用
    selling_expense: Mapped[Optional[float]] = mapped_column(Float, comment="销售费用(万元)")
    admin_expense: Mapped[Optional[float]] = mapped_column(Float, comment="管理费用(万元)")
    rd_expense: Mapped[Optional[float]] = mapped_column(Float, comment="研发费用(万元)")
    finance_expense: Mapped[Optional[float]] = mapped_column(Float, comment="财务费用(万元)")

    # 利润
    operating_profit: Mapped[Optional[float]] = mapped_column(Float, comment="营业利润(万元)")
    total_profit: Mapped[Optional[float]] = mapped_column(Float, comment="利润总额(万元)")
    income_tax: Mapped[Optional[float]] = mapped_column(Float, comment="所得税费用(万元)")
    net_profit: Mapped[Optional[float]] = mapped_column(Float, comment="净利润(万元)")
    net_profit_yoy: Mapped[Optional[float]] = mapped_column(Float, comment="净利润同比增长率(%)")
    net_profit_excl: Mapped[Optional[float]] = mapped_column(Float, comment="扣非净利润(万元)")
    net_profit_excl_yoy: Mapped[Optional[float]] = mapped_column(Float, comment="扣非净利润同比增长率(%)")

    # 每股收益
    eps_basic: Mapped[Optional[float]] = mapped_column(Float, comment="基本每股收益(元)")
    eps_diluted: Mapped[Optional[float]] = mapped_column(Float, comment="稀释每股收益(元)")

    stock = relationship("Stock", back_populates="income_statements")

    __table_args__ = (
        Index("idx_income_stock_date", "stock_id", "report_date"),
        Index("idx_income_fiscal", "stock_id", "fiscal_year", "period"),
    )


class BalanceSheet(Base):
    """资产负债表"""
    __tablename__ = "balance_sheets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    stock_id: Mapped[int] = mapped_column(Integer, ForeignKey("stocks.id"), nullable=False)
    report_date: Mapped[str] = mapped_column(String(10), nullable=False, comment="报告日期")
    report_type: Mapped[str] = mapped_column(String(10), nullable=False, comment="报告类型")
    fiscal_year: Mapped[int] = mapped_column(Integer, nullable=False)
    period: Mapped[str] = mapped_column(String(10), nullable=False)

    # 资产
    total_assets: Mapped[Optional[float]] = mapped_column(Float, comment="总资产(万元)")
    current_assets: Mapped[Optional[float]] = mapped_column(Float, comment="流动资产(万元)")
    cash_and_equivalents: Mapped[Optional[float]] = mapped_column(Float, comment="货币资金(万元)")
    trading_assets: Mapped[Optional[float]] = mapped_column(Float, comment="交易性金融资产(万元)")
    accounts_receivable: Mapped[Optional[float]] = mapped_column(Float, comment="应收账款(万元)")
    inventories: Mapped[Optional[float]] = mapped_column(Float, comment="存货(万元)")
    prepaid_expenses: Mapped[Optional[float]] = mapped_column(Float, comment="预付账款(万元)")
    non_current_assets: Mapped[Optional[float]] = mapped_column(Float, comment="非流动资产(万元)")
    fixed_assets: Mapped[Optional[float]] = mapped_column(Float, comment="固定资产(万元)")
    intangible_assets: Mapped[Optional[float]] = mapped_column(Float, comment="无形资产(万元)")
    goodwill: Mapped[Optional[float]] = mapped_column(Float, comment="商誉(万元)")

    # 负债
    total_liabilities: Mapped[Optional[float]] = mapped_column(Float, comment="总负债(万元)")
    current_liabilities: Mapped[Optional[float]] = mapped_column(Float, comment="流动负债(万元)")
    short_term_borrowing: Mapped[Optional[float]] = mapped_column(Float, comment="短期借款(万元)")
    accounts_payable: Mapped[Optional[float]] = mapped_column(Float, comment="应付账款(万元)")
    non_current_liabilities: Mapped[Optional[float]] = mapped_column(Float, comment="非流动负债(万元)")
    long_term_borrowing: Mapped[Optional[float]] = mapped_column(Float, comment="长期借款(万元)")
    bonds_payable: Mapped[Optional[float]] = mapped_column(Float, comment="应付债券(万元)")

    # 所有者权益
    total_equity: Mapped[Optional[float]] = mapped_column(Float, comment="股东权益合计(万元)")
    paid_in_capital: Mapped[Optional[float]] = mapped_column(Float, comment="实收资本(万元)")
    capital_reserve: Mapped[Optional[float]] = mapped_column(Float, comment="资本公积(万元)")
    retained_earnings: Mapped[Optional[float]] = mapped_column(Float, comment="未分配利润(万元)")
    minority_interest: Mapped[Optional[float]] = mapped_column(Float, comment="少数股东权益(万元)")
    bvps: Mapped[Optional[float]] = mapped_column(Float, comment="每股净资产(元)")

    stock = relationship("Stock", back_populates="balance_sheets")

    __table_args__ = (
        Index("idx_balance_stock_date", "stock_id", "report_date"),
    )


class CashFlowStatement(Base):
    """现金流量表"""
    __tablename__ = "cash_flow_statements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    stock_id: Mapped[int] = mapped_column(Integer, ForeignKey("stocks.id"), nullable=False)
    report_date: Mapped[str] = mapped_column(String(10), nullable=False)
    report_type: Mapped[str] = mapped_column(String(10), nullable=False)
    fiscal_year: Mapped[int] = mapped_column(Integer, nullable=False)
    period: Mapped[str] = mapped_column(String(10), nullable=False)

    # 经营活动
    operating_cash_flow: Mapped[Optional[float]] = mapped_column(Float, comment="经营活动现金流净额(万元)")
    cash_from_sales: Mapped[Optional[float]] = mapped_column(Float, comment="销售商品收到的现金(万元)")
    cash_paid_to_employees: Mapped[Optional[float]] = mapped_column(Float, comment="支付给职工的现金(万元)")
    cash_paid_for_taxes: Mapped[Optional[float]] = mapped_column(Float, comment="支付的各项税费(万元)")

    # 投资活动
    investing_cash_flow: Mapped[Optional[float]] = mapped_column(Float, comment="投资活动现金流净额(万元)")
    cash_paid_for_assets: Mapped[Optional[float]] = mapped_column(Float, comment="购建资产支付的现金(万元)")
    cash_from_disposal: Mapped[Optional[float]] = mapped_column(Float, comment="处置资产收回的现金(万元)")
    investment_paid: Mapped[Optional[float]] = mapped_column(Float, comment="投资支付的现金(万元)")

    # 筹资活动
    financing_cash_flow: Mapped[Optional[float]] = mapped_column(Float, comment="筹资活动现金流净额(万元)")
    cash_from_borrowing: Mapped[Optional[float]] = mapped_column(Float, comment="取得借款收到的现金(万元)")
    cash_repay_borrowing: Mapped[Optional[float]] = mapped_column(Float, comment="偿还债务支付的现金(万元)")
    dividend_paid: Mapped[Optional[float]] = mapped_column(Float, comment="分配股利支付的现金(万元)")

    # 汇总
    net_cash_change: Mapped[Optional[float]] = mapped_column(Float, comment="现金及等价物净增加额(万元)")
    free_cash_flow: Mapped[Optional[float]] = mapped_column(Float, comment="自由现金流(万元)")

    stock = relationship("Stock", back_populates="cash_flows")

    __table_args__ = (
        Index("idx_cashflow_stock_date", "stock_id", "report_date"),
    )


class FinancialRatio(Base):
    """财务指标（计算后存储）"""
    __tablename__ = "financial_ratios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    stock_id: Mapped[int] = mapped_column(Integer, ForeignKey("stocks.id"), nullable=False)
    report_date: Mapped[str] = mapped_column(String(10), nullable=False, comment="报告日期")
    period: Mapped[str] = mapped_column(String(10), nullable=False, comment="报告期间")

    # 盈利能力指标
    gross_margin: Mapped[Optional[float]] = mapped_column(Float, comment="毛利率(%)")
    operating_margin: Mapped[Optional[float]] = mapped_column(Float, comment="营业利润率(%)")
    net_margin: Mapped[Optional[float]] = mapped_column(Float, comment="净利率(%)")
    roe: Mapped[Optional[float]] = mapped_column(Float, comment="净资产收益率 ROE(%)")
    roa: Mapped[Optional[float]] = mapped_column(Float, comment="总资产收益率 ROA(%)")
    roic: Mapped[Optional[float]] = mapped_column(Float, comment="投入资本回报率 ROIC(%)")

    # 营运能力指标
    inventory_turnover: Mapped[Optional[float]] = mapped_column(Float, comment="存货周转率")
    receivable_turnover: Mapped[Optional[float]] = mapped_column(Float, comment="应收账款周转率")
    total_asset_turnover: Mapped[Optional[float]] = mapped_column(Float, comment="总资产周转率")
    fixed_asset_turnover: Mapped[Optional[float]] = mapped_column(Float, comment="固定资产周转率")

    # 偿债能力指标
    current_ratio: Mapped[Optional[float]] = mapped_column(Float, comment="流动比率")
    quick_ratio: Mapped[Optional[float]] = mapped_column(Float, comment="速动比率")
    cash_ratio: Mapped[Optional[float]] = mapped_column(Float, comment="现金比率")
    debt_to_equity: Mapped[Optional[float]] = mapped_column(Float, comment="资产负债率(%)")
    interest_coverage: Mapped[Optional[float]] = mapped_column(Float, comment="利息保障倍数")

    # 成长能力指标
    revenue_growth: Mapped[Optional[float]] = mapped_column(Float, comment="营收增长率(%)")
    net_profit_growth: Mapped[Optional[float]] = mapped_column(Float, comment="净利润增长率(%)")
    total_asset_growth: Mapped[Optional[float]] = mapped_column(Float, comment="总资产增长率(%)")
    equity_growth: Mapped[Optional[float]] = mapped_column(Float, comment="净资产增长率(%)")

    # 杜邦分析分解
    dupont_net_margin: Mapped[Optional[float]] = mapped_column(Float, comment="杜邦-净利率(%)")
    dupont_asset_turnover: Mapped[Optional[float]] = mapped_column(Float, comment="杜邦-资产周转率")
    dupont_equity_multiplier: Mapped[Optional[float]] = mapped_column(Float, comment="杜邦-权益乘数")

    # 现金流指标
    ocf_to_net_profit: Mapped[Optional[float]] = mapped_column(Float, comment="经营现金流/净利润")
    ocf_to_revenue: Mapped[Optional[float]] = mapped_column(Float, comment="经营现金流/营收")
    fcf_yield: Mapped[Optional[float]] = mapped_column(Float, comment="自由现金流收益率(%)")

    # 估值指标
    pe_ratio: Mapped[Optional[float]] = mapped_column(Float, comment="市盈率 PE")
    pb_ratio: Mapped[Optional[float]] = mapped_column(Float, comment="市净率 PB")
    ps_ratio: Mapped[Optional[float]] = mapped_column(Float, comment="市销率 PS")
    peg_ratio: Mapped[Optional[float]] = mapped_column(Float, comment="PEG")
    ev_ebitda: Mapped[Optional[float]] = mapped_column(Float, comment="EV/EBITDA")

    stock = relationship("Stock", back_populates="financial_ratios")

    __table_args__ = (
        Index("idx_ratio_stock_date", "stock_id", "report_date"),
    )
