from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey, Index, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from models.database import Base


class Stock(Base):
    """股票基础信息表"""
    __tablename__ = "stocks"
    
    id = Column(Integer, primary_key=True, index=True)
    stock_code = Column(String(20), unique=True, index=True, nullable=False, comment="股票代码")
    stock_name = Column(String(100), nullable=False, comment="股票名称")
    market = Column(String(20), nullable=False, comment="市场(A股/港股/美股)")
    industry = Column(String(100), comment="所属行业")
    sector = Column(String(100), comment="所属板块")
    list_date = Column(Date, comment="上市日期")
    total_shares = Column(Float, comment="总股本(万股)")
    circulating_shares = Column(Float, comment="流通股本(万股)")
    description = Column(Text, comment="公司简介")
    website = Column(String(255), comment="公司官网")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    financial_statements = relationship("FinancialStatement", back_populates="stock")
    fundamental_metrics = relationship("FundamentalMetric", back_populates="stock")
    market_data = relationship("MarketData", back_populates="stock")


class FinancialStatement(Base):
    """财务报表数据表"""
    __tablename__ = "financial_statements"
    
    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"), nullable=False)
    report_date = Column(Date, nullable=False, comment="报告日期")
    report_type = Column(String(20), nullable=False, comment="报告类型(年报/半年报/季报)")
    
    # 利润表主要项目
    revenue = Column(Float, comment="营业收入(万元)")
    operating_cost = Column(Float, comment="营业成本(万元)")
    gross_profit = Column(Float, comment="毛利润(万元)")
    operating_expense = Column(Float, comment="营业费用(万元)")
    operating_profit = Column(Float, comment="营业利润(万元)")
    total_profit = Column(Float, comment="利润总额(万元)")
    net_profit = Column(Float, comment="净利润(万元)")
    net_profit_deducted = Column(Float, comment="扣非净利润(万元)")
    eps = Column(Float, comment="每股收益(元)")
    
    # 资产负债表主要项目
    total_assets = Column(Float, comment="总资产(万元)")
    total_liabilities = Column(Float, comment="总负债(万元)")
    total_equity = Column(Float, comment="股东权益(万元)")
    current_assets = Column(Float, comment="流动资产(万元)")
    current_liabilities = Column(Float, comment="流动负债(万元)")
    cash_and_equivalents = Column(Float, comment="货币资金(万元)")
    inventory = Column(Float, comment="存货(万元)")
    accounts_receivable = Column(Float, comment="应收账款(万元)")
    accounts_payable = Column(Float, comment="应付账款(万元)")
    debt = Column(Float, comment="有息负债(万元)")
    
    # 现金流量表主要项目
    operating_cashflow = Column(Float, comment="经营活动现金流(万元)")
    investing_cashflow = Column(Float, comment="投资活动现金流(万元)")
    financing_cashflow = Column(Float, comment="筹资活动现金流(万元)")
    free_cashflow = Column(Float, comment="自由现金流(万元)")
    capex = Column(Float, comment="资本支出(万元)")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    stock = relationship("Stock", back_populates="financial_statements")
    
    __table_args__ = (
        Index("idx_stock_report", "stock_id", "report_date"),
        Index("idx_report_type", "report_type"),
    )


class FundamentalMetric(Base):
    """基本面指标计算结果表"""
    __tablename__ = "fundamental_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"), nullable=False)
    calc_date = Column(Date, nullable=False, comment="计算日期")
    
    # 盈利能力指标
    gross_margin = Column(Float, comment="毛利率(%)")
    net_margin = Column(Float, comment="净利率(%)")
    roe = Column(Float, comment="净资产收益率(%)")
    roa = Column(Float, comment="总资产收益率(%)")
    roic = Column(Float, comment="投资资本回报率(%)")
    
    # 成长性指标
    revenue_growth_yoy = Column(Float, comment="营收同比增长率(%)")
    net_profit_growth_yoy = Column(Float, comment="净利润同比增长率(%)")
    revenue_growth_3y_cagr = Column(Float, comment="营收3年复合增长率(%)")
    net_profit_growth_3y_cagr = Column(Float, comment="净利润3年复合增长率(%)")
    
    # 估值指标
    pe_ratio = Column(Float, comment="市盈率")
    pb_ratio = Column(Float, comment="市净率")
    ps_ratio = Column(Float, comment="市销率")
    pcf_ratio = Column(Float, comment="市现率")
    ev_ebitda = Column(Float, comment="企业价值/EBITDA")
    peg_ratio = Column(Float, comment="PEG比率")
    
    # 财务健康指标
    current_ratio = Column(Float, comment="流动比率")
    quick_ratio = Column(Float, comment="速动比率")
    debt_to_equity = Column(Float, comment="资产负债率(%)")
    interest_coverage = Column(Float, comment="利息保障倍数")
    
    # 运营效率指标
    inventory_turnover = Column(Float, comment="存货周转率")
    receivable_turnover = Column(Float, comment="应收账款周转率")
    total_asset_turnover = Column(Float, comment="总资产周转率")
    
    # 现金流指标
    operating_cashflow_ratio = Column(Float, comment="经营现金流/营收")
    free_cashflow_yield = Column(Float, comment="自由现金流收益率(%)")
    cash_conversion_cycle = Column(Float, comment="现金转换周期(天)")
    
    # 综合评分
    quality_score = Column(Float, comment="质量评分(0-100)")
    value_score = Column(Float, comment="价值评分(0-100)")
    growth_score = Column(Float, comment="成长评分(0-100)")
    health_score = Column(Float, comment="健康评分(0-100)")
    overall_score = Column(Float, comment="综合评分(0-100)")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    stock = relationship("Stock", back_populates="fundamental_metrics")
    
    __table_args__ = (
        Index("idx_metric_stock_date", "stock_id", "calc_date"),
    )


class MarketData(Base):
    """行情数据表"""
    __tablename__ = "market_data"
    
    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"), nullable=False)
    trade_date = Column(Date, nullable=False, comment="交易日期")
    
    open_price = Column(Float, comment="开盘价")
    high_price = Column(Float, comment="最高价")
    low_price = Column(Float, comment="最低价")
    close_price = Column(Float, comment="收盘价")
    volume = Column(Float, comment="成交量(手)")
    turnover = Column(Float, comment="成交额(万元)")
    change_pct = Column(Float, comment="涨跌幅(%)")
    market_cap = Column(Float, comment="总市值(亿元)")
    circulating_market_cap = Column(Float, comment="流通市值(亿元)")
    turnover_rate = Column(Float, comment="换手率(%)")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    stock = relationship("Stock", back_populates="market_data")
    
    __table_args__ = (
        Index("idx_market_stock_date", "stock_id", "trade_date"),
    )
